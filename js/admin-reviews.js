window.loadPendingReviews=async()=>{
 const box=document.getElementById('pendingReviews');box.textContent='Loading…';
 const {data,error}=await supabaseClient.from('reviews').select('id,product_id,display_name,rating,body,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(100);
 box.replaceChildren();if(error){box.textContent='Unable to load reviews. Check admin permissions.';return;}
 if(!data.length){box.textContent='No pending reviews';return;}
 for(const r of data){const item=document.createElement('div');item.className='pending-review';const p=document.createElement('p');p.textContent=`Product #${r.product_id} | ${r.display_name} | ${r.rating}/5 — ${r.body}`;item.append(p);
 for(const [label,status] of [['Approve','approved'],['Reject','rejected']]){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.onclick=async()=>{btn.disabled=true;const {error}=await supabaseClient.from('reviews').update({status}).eq('id',r.id);if(error){alert(error.message);btn.disabled=false;}else window.loadPendingReviews();};item.append(btn);}box.append(item);}
};
