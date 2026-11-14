(() => {
 const dialog=document.getElementById('reviewDialog'), form=document.getElementById('reviewForm'), status=document.getElementById('reviewStatus');
 let productId=null, widgetId=null;
 const captchaKey=window.NHABIA_TURNSTILE_SITE_KEY || '';
 window.openReviewForm=(id,name)=>{productId=id;form.reset();status.textContent='';document.getElementById('reviewProductName').textContent=name;dialog.showModal();if(captchaKey&&window.turnstile){if(widgetId!==null)turnstile.remove(widgetId);widgetId=turnstile.render('#reviewCaptcha',{sitekey:captchaKey});}};
 document.getElementById('closeReview').onclick=()=>dialog.close();
 async function refreshReviews(){
  const nodes=[...document.querySelectorAll('[data-reviews-for]')];
  for(const node of nodes){
   const {data,error}=await supabaseClient.from('reviews').select('display_name,rating,body,created_at').eq('product_id',node.dataset.reviewsFor).eq('status','approved').order('created_at',{ascending:false}).limit(5);
   node.replaceChildren();if(error){node.textContent='Reviews unavailable';continue;}
   if(!data.length){node.textContent='No reviews yet';continue;}
   for(const r of data){const el=document.createElement('p');el.className='review-entry';el.textContent=`${'★'.repeat(r.rating)} ${r.display_name}: ${r.body}`;node.append(el);}
  }
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;status.textContent='Submitting…';
  try{
   const token=widgetId!==null&&window.turnstile?turnstile.getResponse(widgetId):'';
   const response=await fetch('/.netlify/functions/submit-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:productId,display_name:document.getElementById('reviewName').value,rating:Number(document.getElementById('reviewRating').value),body:document.getElementById('reviewText').value,captcha_token:token})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Submission failed');status.textContent='Thank you. Your review is awaiting approval.';form.reset();
  }catch(err){status.textContent=err.message||'Please try again later';}finally{btn.disabled=false;if(widgetId!==null&&window.turnstile)turnstile.reset(widgetId);}
 });
 window.addEventListener('load',()=>setTimeout(refreshReviews,500));
})();
