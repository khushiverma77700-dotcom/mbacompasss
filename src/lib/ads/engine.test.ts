import { describe, expect, it } from 'vitest';
import { detectPageType, eligible, planPage, relevanceScore, type AdCampaign } from './engine';
const ad = (patch: Partial<AdCampaign> = {}): AdCampaign => ({
  id:'a',ad_code:'a',name:'Course',ad_type:'text_cta',status:'active',headline:null,body:null,cta_text:null,
  desktop_image_url:null,mobile_image_url:null,html_content:null,alt_text:null,destination_url:'/courses',
  start_at:null,end_at:null,priority:5,weight:1,page_types:[],include_paths:[],exclude_paths:[],keywords:[],
  devices:'all',placements:['in_content','sidebar','end'],max_per_page:3,min_paragraph_gap:2,cap_per_day:0,cap_per_session:0,is_fallback:false,conversion_path:null,...patch,
});
const ctx = {path:'/article/fees',pageType:'article',device:'desktop' as const,text:'cat mba fees',caps:{},today:'2026-10-07',now:Date.now()};
const settings={enabled:true,max_ads_per_page:2,excluded_paths:[],allow_popup:false,label_text:'Sponsored'};
describe('dynamic ad selection',()=>{
  it('classifies directories separately from articles',()=>{expect(detectPageType('/blog')).toBe('listing');expect(detectPageType('/article/fees')).toBe('article');});
  it('fills reading and sidebar slots before footer',()=>{
    const plan=planPage([ad()],settings,[{key:'end',placement:'end'},{key:'middle',placement:'in_content'},{key:'side',placement:'sidebar'}],ctx,20);
    expect(plan.middle?.id).toBe('a');expect(plan.side?.id).toBe('a');
  });
  it('reserves remaining visitor cap across simultaneous slots',()=>{
    const plan=planPage([ad({cap_per_day:3})],settings,[{key:'middle',placement:'in_content'},{key:'side',placement:'sidebar'},{key:'end',placement:'end'}],{...ctx,caps:{a:{day:ctx.today,dayCount:2,session:0}}},20);
    expect(Object.keys(plan)).toEqual(['middle']);
  });
  it('journey relevance cannot bypass page exclusions',()=>{
    const campaign=ad({exclude_paths:['/article/*'],keywords:['cat']});
    const journey={entryPath:'/exams/cat',previousPath:'/',interests:['cat preparation']};
    expect(relevanceScore(campaign,journey)).toBeGreaterThan(1);
    expect(eligible(campaign,{...ctx,journey})).toBe(false);
  });
  it('house ads can fill middle slots while preserving placement permissions',()=>{
    const plan=planPage([ad({is_house:true})],settings,[{key:'middle',placement:'after_intro'}],ctx,20);expect(plan.middle?.id).toBe('a');
  });
});