import { CATEGORIES, SCOPES, DECISIONS, SCHEMA, escapeHtml as esc, publicUrl, indexStudy, blankRecord, completionErrors, normalizeRecord, parseReviewFile, mergeImported, exportPayload, toCsv, matchesSearch } from './core.mjs';

const $=id=>document.getElementById(id);
const MODE_LABELS={followups:'待核实资料',routes:'已确认 EAP 指南',tools:'连接工具',universities:'全部学校'};
const state={data:null,index:null,own:{},external:[],reviewer:'',mode:'followups',selected:'',query:'',progress:'all',network:'all',category:'all',limit:80,storageOk:true};
let storageKey='',toastTimer=null,renderTimer=null;
const uid=()=>crypto.randomUUID ? crypto.randomUUID() : 'review-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const zhDate=value=>{try{return new Date(value).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}catch{return value;}};
const networkName=v=>v==='eduroam'?'eduroam':v==='school_wifi'?'学校 Wi-Fi':'网络范围待核实';
const recordList=()=>[...Object.values(state.own),...state.external];
const recordsFor=id=>state.external.filter(r=>r.caseId===id);

function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function badge(category,unknown='原文未核实'){return category&&CATEGORIES[category]?`<span class="category-badge ${esc(category)}">${esc(CATEGORIES[category].zh)}</span>`:`<span class="category-badge unknown">${esc(unknown)}</span>`;}
function safeLink(url,label,cls=''){const safe=publicUrl(url);return safe?`<a class="${cls}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
function school(id){return state.index.universities.get(id);}
function allItems(mode=state.mode){return mode==='universities'?state.data.universities.map(u=>state.index.cases.get('school:'+u.id)):state.data[mode].map(i=>state.index.cases.get(i.id));}
function getItem(id){
  if(state.index.cases.has(id))return state.index.cases.get(id);
  const record=state.own[id]||state.external.find(r=>r.caseId===id);
  return record?{id,universityId:record.universityId,kind:'proposal',view:record.view||'unknown',category:null,ssid:record.ssid||''}:null;
}
function recordState(item){const own=state.own[item.id];return own?.completed?'done':own?'draft':recordsFor(item.id).length?'imported':'todo';}
function filteredItems(){
  return allItems().filter(item=>{
    const u=school(item.universityId),record=state.own[item.id];
    if(!matchesSearch(item,u,state.query))return false;
    if(state.progress==='todo'&&record?.completed)return false;
    if(state.progress==='draft'&&(!record||record.completed))return false;
    if(state.progress==='done'&&!record?.completed)return false;
    if(state.progress==='changed'&&!['correction','new_evidence','excluded'].includes(record?.decision))return false;
    if(state.progress==='imported'&&!recordsFor(item.id).length)return false;
    if(state.network!=='all'){
      if(state.mode==='universities'){
        if(!state.data.routes.some(r=>r.universityId===item.universityId&&r.view===state.network))return false;
      }else if(item.view!==state.network)return false;
    }
    if(state.mode==='routes'&&state.category!=='all'&&item.category!==state.category)return false;
    return true;
  });
}
function persist(){
  try{localStorage.setItem(storageKey,JSON.stringify({schema:SCHEMA,snapshotId:state.data.snapshotId,reviewer:state.reviewer,own:Object.values(state.own),external:state.external}));state.storageOk=true;}
  catch{state.storageOk=false;}
  updateProgress();
}
function restore(){
  try{
    const raw=localStorage.getItem(storageKey);if(!raw)return;
    const saved=JSON.parse(raw);if(saved.schema!==SCHEMA||saved.snapshotId!==state.data.snapshotId)throw new Error('存储版本不匹配');
    state.reviewer=typeof saved.reviewer==='string'?saved.reviewer.slice(0,100):'';
    for(const record of saved.own||[]){const r=normalizeRecord(record,state.index);state.own[r.caseId]=r;}
    state.external=(saved.external||[]).map(r=>normalizeRecord(r,state.index));
  }catch{notify('本机记录无法完整恢复。请保留已下载的 JSON 备份，再导入核对。');}
}
function updateProgress(){
  const own=Object.values(state.own),done=own.filter(r=>r.completed).length,drafts=own.length-done;
  $('reviewedStat').innerHTML=`${done}<span>项</span>`;
  $('draftStat').textContent=drafts?`另有 ${drafts} 项草稿`:'未改变研究原始分类';
  $('saveStatus').classList.toggle('error-saved',!state.storageOk);
  $('saveStatus').textContent=state.storageOk?(own.length?'已自动保存到本机':'尚无审阅记录'):'本机存储不可用，请立即导出';
  const footer=$('formSavedStatus');if(footer)footer.textContent=state.storageOk?'输入自动保存为草稿 · 下载后才会共享':'本机存储不可用，请导出备份';
}
function renderList(){
  const items=filteredItems();
  $('resultCount').textContent=`${items.length} ${state.mode==='universities'?'所学校':'个项目'}`;
  $('categoryFilterWrap').hidden=state.mode!=='routes';
  $('networkFilter').disabled=state.mode==='followups';
  if(!items.length){$('caseList').innerHTML='<div class="list-empty">没有符合筛选条件的项目。<br>试试中文校名、英文校名或 SSID。</div>';return;}
  const selection=getItem(state.selected);
  $('caseList').innerHTML=items.slice(0,state.limit).map(item=>{
    const u=school(item.universityId),reviewState=recordState(item),active=state.selected===item.id||(selection?.kind==='proposal'&&selection.universityId===item.universityId);
    let label=state.mode==='routes'?CATEGORIES[item.category].zh:state.mode==='tools'?(item.kind==='eap_onboarding'?'EAP 配置工具':'APP · EAP 未确认'):state.mode==='universities'?(state.data.followups.some(c=>c.universityId===u.id)?'有待核实资料':'已有检索记录'):'原文待核实';
    let extra=reviewState==='done'?'<span class="micro-badge done">已复核</span>':reviewState==='draft'?'<span class="micro-badge draft">草稿</span>':reviewState==='imported'?'<span class="micro-badge imported">有导入意见</span>':'';
    return `<div role="listitem"><button class="case-item ${active?'active':''}" type="button" data-select="${esc(item.id)}" ${active?'aria-current="true"':''}><span class="case-item-top"><span class="case-name">${esc(u.nameZh)}</span><span class="case-index">#${String(u.id).padStart(3,'0')}</span></span><span class="case-english" title="${esc(u.name)}">${esc(u.name)}</span><span class="case-bottom"><span class="micro-badge ${state.mode==='followups'?'pending':''}">${esc(label)}</span>${extra}${item.ssid?`<span class="ssid-mini">${esc(item.ssid)}</span>`:''}</span></button></div>`;
  }).join('')+(items.length>state.limit?`<button class="load-more" type="button" data-load-more>再显示 ${Math.min(80,items.length-state.limit)} 项 · 共 ${items.length} 项</button>`:'');
  const selectedPosition=items.findIndex(i=>i.id===state.selected);
  $('selectionPosition').textContent=selectedPosition>=0?`当前第 ${selectedPosition+1} / ${items.length} 项`:'从列表选择一项开始';
}
function sourceList(sources){
  if(!sources.length)return '<div class="source-empty">当前记录没有可公开链接的独立原文。可以从学校官网查找，并在下方补充具体指南地址。</div>';
  const rows=sources.map((s,i)=>{
    const url=publicUrl(s.url);if(!url)return '';
    const type=/\.pdf(?:[?#]|$)/i.test(url)?'PDF':/\.docx?(?:[?#]|$)/i.test(url)?'DOC':/\.mp4(?:[?#]|$)/i.test(url)?'VIDEO':/\.(png|jpg|gif|jpeg)(?:[?#]|$)/i.test(url)?'IMG':'WEB';
    return `<div class="source-row" ${i>=6?'data-extra-source hidden':''}><span class="source-file">${type}</span><div class="source-text"><a class="source-title" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.label)}">${esc(s.label||'官方原文')} ↗</a><span class="source-url" title="${esc(url)}">${esc(url)}</span></div><span class="source-status ${s.observed&&!s.observed.startsWith('HTTP 200')?'bad':''}">${esc(s.observed||'官方来源')}</span></div>`;
  }).join('');
  return `<div class="source-list">${rows}${sources.length>6?`<button class="source-more" id="showSources" type="button">展开其余 ${sources.length-6} 个来源</button>`:''}</div><p class="source-note">响应状态是此前调查时的记录；HTTP 200 也可能返回错误页或验证码，不代表文档已读到。</p>`;
}
function relatedItems(item){
  const id=item.universityId;
  const links=[...state.data.routes,...state.data.followups,...state.data.tools].filter(r=>r.universityId===id&&r.id!==item.id);
  const proposals=[...new Map(recordList().filter(r=>r.universityId===id&&r.caseId.startsWith('proposal:')&&r.caseId!==item.id).map(r=>[r.caseId,r])).values()];
  let html=links.map(r=>`<button type="button" data-related="${esc(r.id)}">${r.id.startsWith('route:')?esc(networkName(r.view)+' · '+r.ssid):r.id.startsWith('followup:')?'待核实资料':r.kind==='eap_onboarding'?'EAP 配置工具':'Android 联网 APP'} ↗</button>`).join('');
  html+=proposals.map(r=>`<button type="button" data-related="${esc(r.caseId)}">补充路线 ${esc(r.ssid||'草稿')} ↗</button>`).join('');
  if(!item.id.startsWith('school:'))html+=`<button type="button" data-related="school:${id}">查看该校检索记录 ↗</button>`;
  return html?`<div class="section-heading"><h3>该校其他研究项目</h3></div><p class="other-case-note">同一学校可同时有已确认指南和未核实资料，各项目分开复核。</p><div class="related-routes">${html}</div>`:'';
}
function imageEvidence(item){
  if(!item.images?.length)return item.id.startsWith('route:')?'<p class="fine-print">此条以已恢复的官方文字步骤为证，或原图未能取得；不表示已经查看了不存在于本页的图片。请打开原文核对。</p>':'';
  return `<div class="section-heading"><h3>已核对图像</h3><span>点击放大查看</span></div><div class="evidence-grid">${item.images.map((img,i)=>`<button type="button" class="evidence-image" data-image="${esc(img.src)}" data-caption="${esc(school(item.universityId).nameZh+' · '+(item.ssid||'官方指南')+' · 图 '+(i+1))}"><img src="${esc(img.src)}" width="${img.width}" height="${img.height}" alt="${esc(school(item.universityId).nameZh)} 官方指南证据图 ${i+1}" loading="lazy" decoding="async"><span>证据图 ${i+1} · ${img.width} × ${img.height} ↗</span></button>`).join('')}</div>`;
}
function detailResearch(item,u){
  const isRoute=item.id.startsWith('route:'),isPending=item.id.startsWith('followup:'),isTool=item.id.startsWith('client:')||item.id.startsWith('onboarding:');
  const sources=isRoute||isTool?[{url:item.sourceUrl,label:'官方原文 · '+(item.ssid||item.label||''),observed:''},...(item.profileUrl?[{url:item.profileUrl,label:'机构专属配置页面',observed:''}]:[])]:item.sources||u.sources;
  let finding='';
  if(isPending){finding=`<div class="finding-box pending"><div class="finding-label"><span>当前研究状态 · 不是匿名身份类别</span>${badge(null)}</div><h4>这份资料的配置内容仍待核实</h4><p class="primary-note">${esc(item.reasonZh)}</p><div class="finding-footer">请优先打开下方原文，确认是否有 Android EAP 操作。该校的其他已确认指南仍单独计数。${item.guideCredentialsRequired?'此前实际观察到指南需要身份登录；未使用账号访问。':''}</div></div><details class="details-note"><summary>展开原始英文研究记录</summary><div><pre>${esc(item.reason)}</pre></div></details>`;}
  else if(isRoute){finding=`<div class="finding-box"><div class="finding-label"><span>当前研究分类 · ${esc(item.routeId)}</span>${badge(item.category)}</div><h4>${esc(networkName(item.view))} <span class="muted">/</span> ${esc(item.ssid)}</h4><p>${esc(item.identityEvidence)}</p><div class="finding-footer">颜色用于区分配置建议；“未说明”不代表已经证实身份泄露。${item.newInPass?' 本次严格复核新增的配置路线。':''}</div></div>${item.conditionalIdentityAllowed?'<div class="important-caveat"><strong>此条存在条件性例外：</strong>默认明确要求留空，但另有条件允许填写与 Identity 相同的账号。请同时复核原文条件，不能将此条理解为无条件的隐私保护。</div>':''}<dl class="evidence-meta"><dt>Android 判断依据</dt><dd>${esc(item.androidBasis||'见原文记录')} ${item.androidConfidence==='medium'?'（上下文推断：中等置信度）':''}</dd><dt>证据位置</dt><dd>${esc(item.evidenceLocation||'官方指南中的设备设置部分')}</dd><dt>原文版本</dt><dd>${item.sourceDate?esc(item.sourceDate):'请结合原文及证据位置核对日期'}${item.sourceDateNote?' · 链接所在官方服务页日期 '+esc(item.sourceDateNote):''}</dd></dl>${item.sourceLimit?`<details class="details-note"><summary>来源和版本限制</summary><div>${esc(item.sourceLimit)}</div></details>`:''}`;}
  else if(isTool){const verified=item.kind==='eap_onboarding';finding=`<div class="finding-box"><div class="finding-label"><span>连接工具 · 不进入手动匿名身份饼图</span><span class="category-badge ${verified?'onboarding':'unknown'}">${verified?'已确认 EAP 配置说明':'EAP 功能未确认'}</span></div><h4>${esc(item.label)}</h4><p>${esc(item.note)}</p><div class="finding-footer">${verified?'已确认的是官方发布的 Android EAP 配置流程，不是已执行或解析的安装器。':'仅确认 Android 联网工具说明；不能由 APP 品牌或账号登录推断 EAP 配置。'}</div></div>${item.limit?`<details class="details-note"><summary>版本和功能范围限制</summary><div>${esc(item.limit)}</div></details>`:''}`;}
  else if(item.kind==='proposal'){finding='<div class="finding-box"><div class="finding-label"><span>新增路线 · 审阅人提案</span><span class="category-badge unknown">尚未合并到研究数据</span></div><h4>补充这所学校的另一条配置路线</h4><p>同校不同 SSID、学校 Wi-Fi 与 eduroam 请分别记录。填写官方链接、Android 判断依据和匿名身份字段证据后再提交复核。</p></div>';}
  else{const routes=state.data.routes.filter(r=>r.universityId===u.id),pending=state.data.followups.some(r=>r.universityId===u.id);finding=`<div class="finding-box"><div class="finding-label"><span>全校检索与来源记录</span><span class="category-badge ${pending?'unknown':'onboarding'}">${pending?'有待核实资料':'已有来源审查记录'}</span></div><h4>${routes.length?`已确认 ${routes.length} 条手动 Android EAP 配置`:'本轮未确认可纳入的手动 Android EAP 配置'}</h4><p>${esc(u.note)}</p><div class="finding-footer">这条记录是学校检索结果，不是单条匿名身份分类。没有确认 EAP 指南的学校不能直接归入 not mentioned。${pending?' 该校另有待核实原文，请查看相关项目。':''}</div></div>`;}
  return `${finding}${relatedItems(item)}<div class="section-heading"><h3><span class="step-number">01</span> 对照官方原文</h3><span>链接在新窗口打开</span></div>${sourceList(sources)}${imageEvidence(item)}${item.id.startsWith('school:')&&u.queries.length?`<details class="details-note"><summary>查看已执行的 ${u.queries.length} 条检索式</summary><div>${u.queries.map(q=>`<p>${esc(q.stage)}</p><pre>${esc(q.query)}</pre>`).join('')}</div></details>`:''}`;
}
function optionValues(values,current,placeholder){return `${placeholder?`<option value="">${esc(placeholder)}</option>`:''}${Object.entries(values).map(([key,label])=>`<option value="${esc(key)}" ${key===current?'selected':''}>${esc(typeof label==='string'?label:label.zh)}</option>`).join('')}`;}
function formHtml(item){
  const record=state.own[item.id]||blankRecord(item,state.reviewer,'placeholder-id-0000');
  const isEap=record.scope==='manual_eap';
  return `<div class="section-heading"><h3><span class="step-number">02</span> 记录你的复核意见</h3><span>原始分类保持不变</span></div><form class="review-form" id="reviewForm" novalidate><div class="form-top"><strong>审阅建议 / Reviewer assessment</strong><span id="formRecordStatus">${record.completed?'已完成本项复核':state.own[item.id]?'已有草稿':'尚未填写'}</span></div><div class="form-body"><div class="form-row"><label class="field"><span>复核结论</span><select name="decision" id="decisionInput">${optionValues(DECISIONS,record.decision,'选择本项结论')}</select></label><label class="field"><span>资料／连接类型</span><select name="scope" id="scopeInput">${optionValues(SCOPES,record.scope)}</select></label></div><div class="form-row"><label class="field"><span>网络范围</span><select name="view">${optionValues({school_wifi:'学校 Wi-Fi',eduroam:'eduroam'},record.view,'未确认 / 不适用')}</select></label><label class="field"><span>SSID <small>不同路线请分别新增</small></span><input name="ssid" maxlength="500" placeholder="例如：eduroam / University-1X" value="${esc(record.ssid)}"></label></div><label class="field" id="categoryField" ${isEap?'':'hidden'}><span>建议的匿名身份分类 <small>仅用于已核对的 Android 手动 EAP</small></span><select name="category" id="categoryInput" ${isEap?'':'disabled'}>${optionValues(CATEGORIES,record.category,'请选择，不能由未读资料推断')}</select><p class="hint">字段在截图中空白但无指示 → 未说明；原文明示留空 → 明确要求留空。</p></label><label class="field"><span>官方原文链接 <small>修改或补充判断时必填</small></span><input name="sourceUrl" type="url" maxlength="6000" placeholder="https://学校官方域名/具体指南" value="${esc(record.sourceUrl)}" inputmode="url"></label><label class="field"><span>关键原文 / 图像证据 <small>可直接填写中文</small></span><textarea name="quote" maxlength="16000" rows="3" placeholder="摘录匿名身份的明确要求，或描述截图中实际看到的设置；标注章节／页码。">${esc(record.quote)}</textarea></label><label class="field" id="androidBasisField"><span>Android 判断依据 <small>手动 EAP 需要记录</small></span><textarea name="androidBasis" maxlength="8000" rows="2" placeholder="例如：标题写 Android；或 Huawei / MIUI 原生 PEAP 界面，即使原文没写 Android 也可以说明。">${esc(record.androidBasis)}</textarea></label><label class="field"><span>其他意见 / 仍无法核实的原因</span><textarea name="notes" maxlength="20000" rows="3" placeholder="例如：原文已迁移；仍是验证码；是 Portal 而非 EAP；不同版本设置不一致。">${esc(record.notes)}</textarea></label><div id="formError" class="form-message" role="status"></div></div><div class="form-bottom"><div class="form-actions-left"><span id="formSavedStatus" class="fine-print">输入自动保存为草稿 · 下载后才会共享</span>${state.own[item.id]?'<button class="text-button" id="undoDraft" type="button">撤销本项意见</button>':''}</div><button class="button primary" type="submit">完成本项复核 ✓</button></div></form><button class="proposal-button" id="addProposal" type="button">＋ 为该校补充另一条指南 / 配置路线</button>`;
}
function importedHtml(item){
  const records=recordsFor(item.id);if(!records.length)return '';
  return `<div class="section-heading"><h3>导入的独立审阅意见</h3><span>${records.length} 条 · 不自动覆盖本机意见</span></div>${records.map(r=>`<div class="import-card"><div class="import-card-header"><strong>${esc(r.reviewer||'未署名审阅人')}</strong><small>${esc(zhDate(r.updatedAt))} · ${r.completed?'已完成':'草稿'}</small></div><p>${esc(DECISIONS[r.decision]||'未选择结论')} · ${esc(SCOPES[r.scope])}${r.category?' · '+esc(CATEGORIES[r.category].zh):''}</p>${safeLink(r.sourceUrl,'审阅人提供的原文','inline-source-link')}${r.quote?`<p>${esc(r.quote)}</p>`:''}${r.androidBasis?`<p>Android 依据：${esc(r.androidBasis)}</p>`:''}${r.notes?`<p>${esc(r.notes)}</p>`:''}<p><button type="button" class="text-button" data-adopt="${esc(r.id)}">载入为我的草稿</button></p></div>`).join('')}`;
}
function renderDetail(){
  const item=getItem(state.selected);
  if(!item){$('caseDetail').innerHTML='<div class="empty-state"><h3>选择一个研究项目</h3><p>从左侧列表开始，或重置筛选查看全部记录。</p></div>';return;}
  const u=school(item.universityId),label=item.id.startsWith('route:')?'已确认 EAP 指南':item.id.startsWith('followup:')?'待核实原文':item.id.startsWith('proposal:')?'新增路线提案':item.id.startsWith('school:')?'学校检索记录':'连接工具';
  $('caseDetail').innerHTML=`<header class="case-heading"><div class="case-heading-top"><div class="case-kicker"><span class="section-flag">${esc(label)}</span><span>·</span><span>名录 #${String(u.id).padStart(3,'0')}</span><span>·</span><span>${esc(u.reviewDate||state.data.date)}</span></div></div><h2>${esc(u.nameZh)}</h2><p class="case-subtitle">${esc(u.name)}</p><div class="case-links">${safeLink(u.homepage,u.domain)}${safeLink(u.profileUrl,'uniRank 名录')}${item.sourceUrl?safeLink(item.sourceUrl,'直接打开指南'):''}</div></header>${detailResearch(item,u)}${formHtml(item)}${importedHtml(item)}`;
  wireForm(item);updateProgress();
}
function collectRecord(item){
  const form=$('reviewForm');if(!form)return null;
  const fields=new FormData(form),existing=state.own[item.id],record=existing?{...existing}:blankRecord(item,state.reviewer,uid());
  for(const key of ['decision','scope','view','ssid','sourceUrl','quote','androidBasis','notes'])record[key]=String(fields.get(key)||'');
  record.category=record.scope==='manual_eap'?String(fields.get('category')||''):'';
  record.reviewer=state.reviewer;record.updatedAt=new Date().toISOString();record.completed=false;
  return record;
}
function wireForm(item){
  const form=$('reviewForm');
  const saveDraft=()=>{
    const record=collectRecord(item);state.own[item.id]=record;persist();
    $('formRecordStatus').textContent='草稿 · 需要点击完成';
    $('formError').textContent='';$('formError').classList.remove('success');
    clearTimeout(renderTimer);renderTimer=setTimeout(renderList,180);
  };
  form.addEventListener('input',saveDraft);
  form.addEventListener('change',event=>{
    if(event.target.name==='scope'){
      const isEap=event.target.value==='manual_eap';$('categoryField').hidden=!isEap;$('categoryInput').disabled=!isEap;
      if(!isEap)$('categoryInput').value='';
    }
    saveDraft();
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();const record=collectRecord(item),errors=completionErrors(record,item);
    state.own[item.id]=record;
    if(errors.length){persist();$('formError').textContent=errors.join(' ');$('formError').classList.remove('success');$('formError').scrollIntoView({block:'nearest'});renderList();return;}
    record.completed=true;state.own[item.id]=record;persist();renderList();
    $('formRecordStatus').textContent='已完成本项复核';$('formError').textContent='本项已复核并保存到本机。可继续下一项，完成后导出文件发回团队。';$('formError').classList.add('success');notify('本项复核已保存。原始研究分类没有改变。');
  });
  $('undoDraft')?.addEventListener('click',()=>{delete state.own[item.id];persist();renderDetail();renderList();notify('已撤销本机这项意见，原始数据和导入意见保持不变。');});
  $('addProposal').addEventListener('click',()=>{
    const proposal={id:'proposal:'+uid(),universityId:item.universityId,kind:'proposal',view:'unknown',category:null};
    state.own[proposal.id]=blankRecord(proposal,state.reviewer,uid());persist();selectCase(proposal.id);
  });
}
function modeFor(id){return id.startsWith('route:')?'routes':id.startsWith('followup:')?'followups':id.startsWith('client:')||id.startsWith('onboarding:')?'tools':null;}
function switchMode(mode,render=true){
  state.mode=mode;state.limit=80;
  $('reviewPanel').setAttribute('aria-labelledby','tab-'+mode);
  if(mode==='followups'){state.network='all';$('networkFilter').value='all';}
  for(const button of $('modeTabs').querySelectorAll('button')){const active=button.dataset.mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  if(render){const items=filteredItems();selectCase(items[0]?.id||'');}
}
function selectCase(id,updateHash=true){
  state.selected=id;renderList();renderDetail();$('caseDetail').scrollTop=0;
  if(id&&updateHash)history.replaceState(null,'','#'+encodeURIComponent(id));
}
function applyFilters(){
  state.limit=80;const items=filteredItems();
  if(!items.some(i=>i.id===state.selected))selectCase(items[0]?.id||'');else renderList();
}
function nextCase(){
  const items=filteredItems(),start=items.findIndex(i=>i.id===state.selected);
  const rest=[...items.slice(start+1),...items.slice(0,start+1)];
  const next=rest.find(i=>!state.own[i.id]?.completed);
  if(!next){notify('当前筛选范围内已没有未完成项目。可切换范围或导出意见。');return;}
  state.limit=Math.max(state.limit,Math.ceil((items.indexOf(next)+1)/80)*80);selectCase(next.id);
  const button=$('caseList').querySelector(`[data-select="${CSS.escape(next.id)}"]`);button?.scrollIntoView({block:'nearest'});
}
function openExport(){
  const records=recordList(),done=records.filter(r=>r.completed).length;
  $('exportSummary').textContent=`当前共 ${records.length} 条独立意见，其中 ${done} 条已完成、${records.length-done} 条草稿。原始研究快照不会随导出改变。`;
  $('exportMessage').textContent='';$('exportDialog').showModal();
}
function download(content,name,type){
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadReview(csv=false){
  try{
    const records=recordList();if(!records.length){$('exportMessage').textContent='还没有审阅意见。先填写一项，再下载审阅文件。';return;}
    const payload=exportPayload(state.data,state.index,records,state.reviewer),suffix=new Date().toLocaleDateString('en-CA'),reviewer=state.reviewer.replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,40)||'reviewer';
    download(csv?toCsv(payload):JSON.stringify(payload,null,2)+'\n',`USRA-China-review-${reviewer}-${suffix}.${csv?'csv':'json'}`,csv?'text/csv;charset=utf-8':'application/json;charset=utf-8');
    $('exportMessage').textContent='已准备下载。请将文件发回研究团队；JSON 也可用于恢复记录。';$('exportMessage').classList.add('success');
  }catch(error){$('exportMessage').textContent=error.message;$('exportMessage').classList.remove('success');}
}
async function importReview(file){
  try{
    if(file.size>20_000_000)throw new Error('文件过大，请选择导出的 JSON 审阅文件。');
    const records=parseReviewFile(await file.text(),state.data,state.index),merged=mergeImported(state.own,state.external,records);
    state.external=merged.records;
    persist();renderList();renderDetail();notify(`已新增 ${merged.added} 条意见、更新 ${merged.updated} 条导入意见，跳过 ${merged.skipped} 条重复记录。原始研究分类和本机意见未被覆盖。`);
  }catch(error){notify(error.message);}
  finally{$('importFile').value='';}
}
function onDetailClick(event){
  const related=event.target.closest('[data-related]');if(related){const mode=modeFor(related.dataset.related);if(mode&&mode!==state.mode){state.query='';$('searchInput').value='';state.progress='all';$('progressFilter').value='all';state.network='all';$('networkFilter').value='all';state.category='all';$('categoryFilter').value='all';switchMode(mode,false);}selectCase(related.dataset.related);return;}
  const image=event.target.closest('[data-image]');if(image){$('expandedImage').src=image.dataset.image;$('viewOriginalImage').href=image.dataset.image;$('imageCaption').textContent=image.dataset.caption;$('imageDialog').showModal();return;}
  const adopt=event.target.closest('[data-adopt]');if(adopt){const r=state.external.find(r=>r.id===adopt.dataset.adopt);if(r){state.own[r.caseId]={...r,id:uid(),reviewer:state.reviewer,completed:false,updatedAt:new Date().toISOString()};persist();renderDetail();renderList();notify('已载入为本机草稿；导入的原意见仍单独保留。');}return;}
  const expand=event.target.closest('#showSources');if(expand){const expanded=expand.getAttribute('aria-expanded')==='true';$('caseDetail').querySelectorAll('[data-extra-source]').forEach(el=>el.hidden=expanded);expand.setAttribute('aria-expanded',String(!expanded));expand.textContent=expanded?'展开其余来源':'收起额外来源';}
}
function wirePage(){
  $('reviewerName').value=state.reviewer;
  $('reviewerName').addEventListener('input',event=>{state.reviewer=event.target.value.slice(0,100);persist();});
  $('modeTabs').addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(button)switchMode(button.dataset.mode);});
  $('modeTabs').addEventListener('keydown',event=>{const buttons=[...$('modeTabs').querySelectorAll('button')],at=buttons.indexOf(document.activeElement);if(at<0)return;let next;if(event.key==='ArrowRight')next=(at+1)%buttons.length;if(event.key==='ArrowLeft')next=(at+buttons.length-1)%buttons.length;if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;if(next!=null){event.preventDefault();buttons[next].focus();switchMode(buttons[next].dataset.mode);}});
  $('searchInput').addEventListener('input',event=>{state.query=event.target.value;applyFilters();});
  $('progressFilter').addEventListener('change',event=>{state.progress=event.target.value;applyFilters();});
  $('networkFilter').addEventListener('change',event=>{state.network=event.target.value;applyFilters();});
  $('categoryFilter').addEventListener('change',event=>{state.category=event.target.value;applyFilters();});
  $('resetFilters').addEventListener('click',()=>{state.query='';state.progress='all';state.network='all';state.category='all';$('searchInput').value='';$('progressFilter').value='all';$('networkFilter').value='all';$('categoryFilter').value='all';applyFilters();});
  $('caseList').addEventListener('click',event=>{const button=event.target.closest('[data-select]');if(button)selectCase(button.dataset.select);if(event.target.closest('[data-load-more]')){state.limit+=80;renderList();}});
  $('caseDetail').addEventListener('click',onDetailClick);
  $('nextButton').addEventListener('click',nextCase);
  for(const id of ['exportButton','exportTop'])$(id).addEventListener('click',openExport);
  $('downloadJson').addEventListener('click',()=>downloadReview(false));$('downloadCsv').addEventListener('click',()=>downloadReview(true));
  $('importButton').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',event=>{if(event.target.files?.[0])importReview(event.target.files[0]);});
  $('guideButton').addEventListener('click',()=>$('guideDialog').showModal());
  for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>$(button.dataset.close).close());
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener('hashchange',()=>{let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(getItem(id)){const mode=modeFor(id);if(mode)switchMode(mode,false);selectCase(id,false);}});
  window.addEventListener('beforeunload',()=>persist());
}
async function init(){
  try{
    const response=await fetch('./data.json');if(!response.ok)throw new Error('HTTP '+response.status);
    state.data=await response.json();state.index=indexStudy(state.data);storageKey='usra-cn-peer-review:'+state.data.snapshotId;
    restore();wirePage();
    $('snapshotDate').textContent=state.data.date.replaceAll('-','.')+' 数据快照';
    let selected='';try{selected=decodeURIComponent(location.hash.slice(1));}catch{}
    if(getItem(selected)){const mode=modeFor(selected);if(mode)switchMode(mode,false);}else selected=state.data.followups[0].id;
    switchMode(state.mode,false);selectCase(selected);updateProgress();
  }catch(error){$('caseDetail').innerHTML=`<div class="error-banner"><strong>研究快照未能载入</strong><p>${esc(error.message)}</p><p>请通过网站链接打开，不要直接双击本地 HTML。刷新后仍失败，请将页面地址发给研究团队。</p></div>`;$('resultCount').textContent='数据载入失败';}
}
init();
