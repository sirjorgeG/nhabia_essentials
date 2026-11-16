
"use strict";

// Nhabia Essentials - Administrator Review Management

window.loadPendingReviews = async function () {

    const box = document.getElementById("pendingReviews");

    if (!box) {
        console.error("Pending reviews container not found.");
        return;
    }

    box.textContent = "Loading customer reviews...";

    if (!window.supabaseClient) {
        box.textContent = "Database connection unavailable.";
        return;
    }

    try {

        // Retrieve pending customer reviews
        const { data, error } = await supabaseClient
            .from("product_reviews")
            .select(
                "id,product_id,reviewer_name,rating,review_text,created_at"
            )
            .eq("status", "pending")
            .order("created_at", {
                ascending: true
            })
            .limit(100);

        box.replaceChildren();

        if (error) {
            console.error("Unable to load pending reviews:", error);
            box.textContent =
                "Unable to load reviews. Check administrator permissions.";
            return;
        }

        if (!data || data.length === 0) {
            box.textContent = "No pending reviews.";
            return;
        }

        for (const review of data) {

            const item = document.createElement("div");
            item.className = "pending-review";

            const heading = document.createElement("h3");
            heading.textContent = `Product #${review.product_id}`;

            const reviewer = document.createElement("p");
            reviewer.textContent =
                `Customer: ${review.reviewer_name}`;

            const rating = document.createElement("p");
            rating.textContent =
                "★".repeat(review.rating) +
                "☆".repeat(5 - review.rating);

            const reviewText = document.createElement("p");
            reviewText.textContent = review.review_text;

            const actions = document.createElement("div");
            actions.className = "button-group";

            const message = document.createElement("p");
            message.setAttribute("role", "status");

            // Approve review
            const approveButton = document.createElement("button");
            approveButton.type = "button";
            approveButton.textContent = "Approve";

            // Reject review
            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.textContent = "Reject";

            async function changeReviewStatus(newStatus) {

                approveButton.disabled = true;
                rejectButton.disabled = true;

                message.textContent = "Updating review...";

                try {

                    const { data: updated, error } =
                        await supabaseClient
                            .from("product_reviews")
                            .update({
                                status: newStatus
                            })
                            .eq("id", review.id)
                            .eq("status", "pending")
                            .select("id");

                    if (error) {
                        throw error;
                    }

                    if (!updated || updated.length !== 1) {
                        throw new Error(
                            "Review was not updated. Check administrator permissions."
                        );
                    }

                    message.textContent =
                        newStatus === "approved"
                            ? "Review approved successfully."
                            : "Review rejected successfully.";

                    await window.loadPendingReviews();

                } catch (error) {

                    console.error("Review update failed:", error);

                    message.textContent =
                        "Unable to update review. Please try again.";

                    approveButton.disabled = false;
                    rejectButton.disabled = false;
                }
            }

            approveButton.addEventListener("click", () => {
                changeReviewStatus("approved");
            });

            rejectButton.addEventListener("click", () => {
                changeReviewStatus("rejected");
            });

            actions.append(approveButton, rejectButton);

            item.append(
                heading,
                reviewer,
                rating,
                reviewText,
                actions,
                message
            );

            box.appendChild(item);
        }

    } catch (error) {

        console.error("Review management error:", error);

        box.textContent =
            "Unable to load customer reviews.";
    }
};
