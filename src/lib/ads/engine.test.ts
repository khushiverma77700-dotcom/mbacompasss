import { describe, expect, it } from 'vitest';
import { detectPageType, eligible, planPage, relevanceScore, smartScore, type AdCampaign } from './engine';
const ad = (patch: Partial<AdCampaign> = {}): AdCampaign => ({
  id:'a',ad_code:'a',name:'Course',ad_type:'text_cta',status:'active',headline:null,body:null,cta_text:null,
  desktop_image_url:null,mobile_image_url:null,html_content:null,alt_text:null,destination_url:'/courses',
  start_at:null,end_at:null,priority:5,weight:1,page_types:[],include_paths:[],exclude_paths:[],keywords:[],
  devices:'all',placements:['in_content','sidebar','end'],max_per_page:3,min_paragraph_gap:2,cap_per_day:0,cap_per_session:0,is_fallback:false,conversion_path:null,...patch,
});
const ctx = {path:'/article/fees',pageType:'article',device:'desktop' as const,text:'cat mba fees',caps:{},today:'2026-10-07',now:Date.now()};
const settings={enabled:true,max_ads_per_page:2,excluded_paths:[],allow_popup:false,label_text:'Sponsored'};
describe('dynamic ad selection',()=>{
  it('never delivers a header ad, including legacy campaigns',()=>{
    const plan=planPage([ad({placements:['top','in_content']})],settings,[{key:'top',placement:'top'},{key:'middle',placement:'in_content'}],ctx,20);
    expect(plan.top).toBeUndefined();expect(plan.middle?.id).toBe('a');
  });
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
});describe('smart delivery',()=>{
  const smart=(patch:Partial<AdCampaign>={})=>ad({smart_mode:true,placements:[],page_types:['home'],keywords:['zzz'],devices:'mobile',impression_budget:1000,...patch});
  it('ignores manual targeting but keeps exclusions',()=>{
    expect(eligible(smart(),ctx)).toBe(true);
    expect(eligible(smart({exclude_paths:['/article/*']}),ctx)).toBe(false);
  });
  it('stops when the view goal is reached',()=>{
    expect(eligible(smart({id:'s'}),{...ctx,delivery:{s:{total:1000,today:5}}})).toBe(false);
  });
  it('keeps visitor caps',()=>{
    expect(eligible(smart({cap_per_day:2}),{...ctx,caps:{a:{day:ctx.today,dayCount:2,session:0}}})).toBe(false);
  });
  it('behind-goal ad scores higher than ahead-of-goal ad',()=>{
    expect(smartScore(smart({smart_plan:{boost:3}}),'article','in_content','desktop')).toBeGreaterThan(smartScore(smart({smart_plan:{boost:0.5}}),'article','in_content','desktop'));
  });
  it('never takes header or popup slots',()=>{
    const plan=planPage([smart()],settings,[{key:'top',placement:'top'},{key:'middle',placement:'in_content'}],ctx,20);
    expect(plan.top).toBeUndefined();expect(plan.middle?.id).toBe('a');
  });
});
