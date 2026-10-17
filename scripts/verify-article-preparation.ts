import {createClient} from '@supabase/supabase-js';
import {prepareArticleDisplay,validArticleDisplay} from '../src/lib/articleDisplay';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw Error('Configuration missing');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:a,error}=await db.from('articles').insert({title:'Preparation verification draft',slug:'preparation-verification-'+Date.now(),content:'<h2>Draft</h2><p>Unpublished content.</p>',published:false}).select('id,content,updated_at').single();
if(error||!a) throw Error('Test draft could not be created');
try {
 const {data:j}=await db.from('article_display_jobs').select('*').eq('article_id',a.id).single();
 if(!j) throw Error('Insert was not queued');
 await db.from('articles').update({content:'<h2>Draft</h2><p>Edited unpublished content.</p>'}).eq('id',a.id);
 const {data:edited}=await db.from('articles').select('content,prepared_display,updated_at').eq('id',a.id).single();
 if(!edited||edited.prepared_display!==null) throw Error('Prepared HTML not invalidated');
 const {data:stale}=await db.rpc('complete_article_display',{_article_id:a.id,_token:j.token,_display:prepareArticleDisplay(a.content)});
 if(stale!==false) throw Error('Stale worker overwrote edited source');
 const {data:newJob}=await db.from('article_display_jobs').select('*').eq('article_id',a.id).single();
 if(!newJob||newJob.token===j.token) throw Error('Edit did not rotate queue capability');
 const response=await fetch('http://localhost:8080/api/public/articles/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({articleId:a.id,token:newJob.token})});
 if(response.status!==204) throw Error('Automatic preparation failed');
 const {data:done}=await db.from('articles').select('content,prepared_display,published,updated_at').eq('id',a.id).single();
 if(!done||done.published||!validArticleDisplay(done.content,done.prepared_display)) throw Error('Draft preparation wrong');
 if(done.updated_at!==edited.updated_at) throw Error('Preparation changed editorial timestamp');
 const {data:settings}=await db.from('article_display_jobs').select('article_id').eq('article_id',a.id);
 if(settings?.length) throw Error('Completed job was not removed');
 console.log('Verified: insert/edit enqueue; stale worker blocked; preparation preserves draft and editorial date; completed job removed.');
} finally {await db.from('articles').delete().eq('id',a.id);}
