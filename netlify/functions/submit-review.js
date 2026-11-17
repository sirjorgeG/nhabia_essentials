
"use strict";

const crypto = require("node:crypto");

// Return a JSON response
const json = (statusCode, body) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
});

exports.handler = async (event) => {

    // Allow POST requests only
    if (event.httpMethod !== "POST") {
        return json(405, {
            error: "Method not allowed"
        });
    }

    // Limit request size
    if (
        Number(event.headers?.["content-length"] || 0) > 5000 ||
        Buffer.byteLength(event.body || "", "utf8") > 5000
    ) {
        return json(413, {
            error: "Request too large"
        });
    }

    // Read private credentials from Netlify
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secret = process.env.TURNSTILE_SECRET_KEY;
    const salt = process.env.REVIEW_RATE_SALT;

    if (!url || !key || !secret || !salt) {
        return json(503, {
            error: "Reviews are not configured yet"
        });
    }

    // Parse customer submission
    let x;

    try {
        x = JSON.parse(event.body || "{}");
    } catch {
        return json(400, {
            error: "Invalid request"
        });
    }

    if (!x || typeof x !== "object" || Array.isArray(x)) {
        return json(400, {
            error: "Invalid request"
        });
    }

    const name = String(x.display_name || "").trim();
    const email = String(x.reviewer_email || "").trim();
    const body = String(x.body || "").trim();

    const rating = x.rating;
    const productId = Number(x.product_id);

    // Validate email address
    const validEmail =
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Validate all review fields
    if (
        !Number.isSafeInteger(productId) ||
        productId < 1 ||
        name.length < 2 ||
        name.length > 60 ||
        !validEmail ||
        body.length < 15 ||
        body.length > 1000 ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5 ||
        typeof x.captcha_token !== "string" ||
        !x.captcha_token
    ) {
        return json(400, {
            error: "Please check the review form and CAPTCHA"
        });
    }

    // Create a privacy-preserving IP hash
    const ip = String(
        event.headers?.["x-nf-client-connection-ip"] ||
        event.headers?.["client-ip"] ||
        "unknown"
    );

    const ipHash = crypto
        .createHmac("sha256", salt)
        .update(ip)
        .digest("hex");

    try {

        // Verify CAPTCHA on the server
        const captcha = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    secret: secret,
                    response: x.captcha_token,
                    remoteip: ip
                })
            }
        );

        if (!captcha.ok) {
            return json(503, {
                error: "CAPTCHA service unavailable"
            });
        }

        const verified = await captcha.json();

        if (!verified.success) {
            return json(403, {
                error: "CAPTCHA verification failed"
            });
        }

        // Supabase server-side authentication
        const headers = {
            apikey: key,
            Authorization: "Bearer " + key,
            "Content-Type": "application/json"
        };

        // Apply database-backed rate limiting
        const limit = await fetch(
            url + "/rest/v1/rpc/claim_review_slot",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    p_ip_hash: ipHash
                })
            }
        );

        if (!limit.ok) {
            return json(503, {
                error: "Please try again later"
            });
        }

        const allowed = await limit.json();

        if (allowed !== true) {
            return json(429, {
                error:
                    "Too many reviews. Please try again later"
            });
        }

        // Confirm product exists
        const product = await fetch(
            url +
                "/rest/v1/products?id=eq." +
                encodeURIComponent(productId) +
                "&select=id&limit=1",
            {
                method: "GET",
                headers
            }
        );

        if (!product.ok) {
            return json(503, {
                error: "Product lookup unavailable"
            });
        }

        const products = await product.json();

        if (!Array.isArray(products) || products.length === 0) {
            return json(400, {
                error: "Product unavailable"
            });
        }

        // Store review with pending status
        const insert = await fetch(
            url + "/rest/v1/product_reviews",
            {
                method: "POST",
                headers: {
                    ...headers,
                    Prefer: "return=minimal"
                },
                body: JSON.stringify({
                    product_id: productId,
                    reviewer_name: name,
                    reviewer_email: email,
                    rating: rating,
                    review_text: body,
                    status: "pending"
                })
            }
        );

        if (!insert.ok) {
            console.error(
                "Review database insertion failed:",
                insert.status
            );

            return json(503, {
                error: "Review could not be submitted"
            });
        }

        // Successful submission
        return json(202, {
            message: "Review awaiting approval"
        });

    } catch (error) {

        console.error(
            "Review service error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return json(503, {
            error: "Review service temporarily unavailable"
        });
    }
};

