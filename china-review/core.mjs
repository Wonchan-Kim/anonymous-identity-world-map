export const CATEGORIES = {
  explicit_blank: { zh: '明确要求留空', en: 'Explicit blank' },
  explicit_value: { zh: '明确指定匿名值', en: 'Explicit value' },
  same_as_identity: { zh: '与真实身份相同', en: 'Same as Identity' },
  not_mentioned: { zh: '未说明匿名身份', en: 'Not mentioned' },
};
export const SCOPES = {
  unknown: '仍未核实配置范围',
  manual_eap: 'Android 手动 EAP / 802.1X',
  eap_onboarding: 'Android EAP 安装器 / 配置工具',
  network_client_unknown: 'Android 联网 APP，EAP 功能未确认',
  portal: '网页认证 / Captive portal',
  psk: '共享密码 / PSK',
  non_eap: '其他非 EAP / 不适用',
};
export const DECISIONS = {
  agree: '已核对，维持现状',
  correction: '建议修改现有判断',
  new_evidence: '补充新指南 / 新证据',
  unresolved: '仍无法核实',
  excluded: '确认排除：非 EAP',
};
export const SCHEMA = 'usra-cn-review/v1';
const owns = (object, key) => Object.hasOwn(object, key);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

export function publicUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const u = new URL(value.trim());
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return '';
    const h = u.hostname.toLowerCase().replace(/\.$/, '');
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return '';
    if (h.includes(':')) return ''; // Research source links use public DNS names or IPv4.
    if (/^\d+(\.\d+){3}$/.test(h)) {
      const [a,b] = h.split('.').map(Number);
      if (a===0 || a===10 || a===127 || a>=224 || (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && b===168) || (a===100 && b>=64 && b<=127)) return '';
    }
    return u.href;
  } catch { return ''; }
}

export function indexStudy(data) {
  if (data.schemaVersion !== 1 || data.universities.length !== 933 || data.routes.length !== 180 || data.followups.length !== 96 || data.tools.length !== 20) throw new Error('研究快照结构或数量不匹配。');
  const universities = new Map(data.universities.map(u => [u.id, u]));
  const cases = new Map();
  for (const u of data.universities) cases.set('school:'+u.id, { id:'school:'+u.id, universityId:u.id, kind:'university', view:'unknown', category:null });
  for (const [array,kind] of [[data.followups,'followup'],[data.routes,'route'],[data.tools,'tool']]) {
    for (const item of array) {
      if (!universities.has(item.universityId) || cases.has(item.id)) throw new Error('研究项目标识发生冲突。');
      cases.set(item.id, {...item, caseKind:kind});
    }
  }
  return { universities, cases };
}

export function baseScope(item) {
  return item.id.startsWith('route:') ? 'manual_eap' : item.kind === 'eap_onboarding' ? 'eap_onboarding' : item.kind === 'network_client_unknown' ? 'network_client_unknown' : 'unknown';
}

export function blankRecord(item, reviewer, id, now = new Date().toISOString()) {
  return {
    id, caseId:item.id, universityId:item.universityId, reviewer:reviewer || '',
    decision:item.id.startsWith('proposal:') ? 'new_evidence' : '',
    scope:baseScope(item), category:item.category || '',
    view: ['eduroam','school_wifi'].includes(item.view) ? item.view : '',
    ssid:item.ssid || '', sourceUrl:item.sourceUrl || '', quote:'',
    androidBasis:item.androidBasis || '', notes:'', updatedAt:now, completed:false,
  };
}

export function completionErrors(record, item) {
  const errors=[];
  if (!owns(DECISIONS, record.decision)) errors.push('请选择本项复核结论。');
  if (!owns(SCOPES, record.scope)) errors.push('请选择资料／连接类型。');
  if (record.sourceUrl && !publicUrl(record.sourceUrl)) errors.push('原文链接需为有效的公开 HTTP / HTTPS 地址。');
  if (record.decision === 'unresolved' && !record.notes.trim()) errors.push('请简要说明仍无法核实的原因。');
  if (['correction','new_evidence'].includes(record.decision)) {
    if (!publicUrl(record.sourceUrl)) errors.push('修改或补充判断时，请填写官方原文链接。');
    if (!record.quote.trim()) errors.push('请摘录支持修改／新证据的关键原文，或描述已核对的图片。');
  }
  if (record.decision === 'excluded' && !['portal','psk','non_eap'].includes(record.scope)) errors.push('排除非 EAP 时，请选择网页认证、共享密码或其他非 EAP 类型。');
  if (record.scope === 'manual_eap' && record.decision !== 'unresolved') {
    if (!['eduroam','school_wifi'].includes(record.view)) errors.push('Android EAP 指南需要标明学校 Wi-Fi 或 eduroam。');
    if (!record.ssid.trim()) errors.push('请填写该 EAP 配置对应的 SSID。');
    if (!owns(CATEGORIES, record.category)) errors.push('请为已核对的 Android EAP 指南选择匿名身份分类。');
    if (!record.androidBasis.trim()) errors.push('请记录 Android 判断依据，可用实际界面或机型上下文。');
  }
  if (record.decision === 'agree' && (record.scope !== baseScope(item) || (item.category && record.category !== item.category))) errors.push('现有类型或分类已改变，请将结论改为“建议修改”或“补充新证据”。');
  return errors;
}

const STRING_LIMITS = {id:120,caseId:120,reviewer:100,decision:30,scope:40,category:40,view:30,ssid:500,sourceUrl:6000,quote:16000,androidBasis:8000,notes:20000,updatedAt:50};
export function normalizeRecord(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('审阅记录格式无效。');
  const result={};
  for (const [field,limit] of Object.entries(STRING_LIMITS)) {
    if (value[field] != null && typeof value[field] !== 'string') throw new Error('审阅字段格式无效：'+field);
    result[field] = (value[field] || '').slice(0,limit);
  }
  if (!/^[a-zA-Z0-9:_-]{12,120}$/.test(result.id)) throw new Error('审阅记录 ID 无效。');
  const item=index.cases.get(result.caseId);
  const custom=/^proposal:[a-zA-Z0-9_-]{12,100}$/.test(result.caseId);
  result.universityId=Number(value.universityId);
  if (!index.universities.has(result.universityId) || (!item && !custom) || (item && item.universityId !== result.universityId)) throw new Error('审阅项目不属于当前学校或研究快照。');
  if (result.decision && !owns(DECISIONS, result.decision)) throw new Error('未知复核结论。');
  if (!owns(SCOPES, result.scope)) throw new Error('未知资料类型。');
  if (result.category && !owns(CATEGORIES, result.category)) throw new Error('未知匿名身份类别。');
  if (result.view && !['eduroam','school_wifi'].includes(result.view)) throw new Error('未知网络范围。');
  if (result.sourceUrl && !publicUrl(result.sourceUrl)) throw new Error('审阅文件包含无效原文链接。');
  if (!Number.isFinite(Date.parse(result.updatedAt))) throw new Error('审阅时间格式无效。');
  result.completed=value.completed===true;
  if (result.scope!=='manual_eap') result.category='';
  const actualItem=item || {id:result.caseId,universityId:result.universityId,view:'unknown',category:null};
  if (result.completed && completionErrors(result, actualItem).length) throw new Error('文件中有标为完成、但缺少必要证据的意见。');
  return result;
}

export function parseReviewFile(text, data, index) {
  if (text.length > 20_000_000) throw new Error('文件过大，请选择此工作台导出的 JSON 审阅文件。');
  let payload;
  try { payload=JSON.parse(text); } catch { throw new Error('无法读取 JSON，请选择原始导出文件。'); }
  if (payload.schema !== SCHEMA) throw new Error('这不是 USRA 中国复核工作台的审阅文件。');
  if (payload.snapshotId !== data.snapshotId) throw new Error('研究快照版本不同，请保留文件并交给研究团队核对，不自动合并。');
  if (!Array.isArray(payload.records) || payload.records.length > 5000) throw new Error('审阅记录列表无效。');
  const ids=new Set();
  const records=payload.records.map(v=>{
    const r=normalizeRecord(v,index);
    if (ids.has(r.id)) throw new Error('同一个文件内出现重复审阅 ID。');
    ids.add(r.id);return r;
  });
  return records;
}

export function mergeImported(own, external, incoming) {
  const ownById=new Map(Object.values(own).map(r=>[r.id,r]));
  const merged=new Map(external.map(r=>[r.id,r]));
  let added=0,updated=0,skipped=0;
  for(const r of incoming){
    const previous=ownById.get(r.id)||merged.get(r.id);
    if(previous&&(previous.caseId!==r.caseId||previous.universityId!==r.universityId||previous.reviewer!==r.reviewer))throw new Error('同一审阅 ID 对应了不同学校或审阅人，请交给研究团队核对。');
    if(ownById.has(r.id)){skipped++;continue;}
    if(!previous){merged.set(r.id,r);added++;}
    else if(Date.parse(r.updatedAt)>Date.parse(previous.updatedAt)){merged.set(r.id,r);updated++;}
    else skipped++;
  }
  return {records:[...merged.values()],added,updated,skipped};
}

export function reviewContext(record, data, index) {
  const u=index.universities.get(record.universityId);
  const item=index.cases.get(record.caseId);
  return {universityName:u.name,universityNameZh:u.nameZh,originalCategory:item?.category || null,originalSsid:item?.ssid || null,originalView:item?.view || null,originalSourceUrl:item?.sourceUrl || null};
}

export function exportPayload(data,index,records,reviewer,now=new Date().toISOString()) {
  const unique=new Map(records.map(r=>[r.id,r]));
  return {schema:SCHEMA,snapshotId:data.snapshotId,researchDate:data.date,exportedAt:now,exportedBy:reviewer || '',recordCount:unique.size,completedCount:[...unique.values()].filter(r=>r.completed).length,note:'Reviewer proposals only; the original research classifications are unchanged. Drafts and imported independent reviews are included.',records:[...unique.values()].map(r=>({...normalizeRecord(r,index),context:reviewContext(r,data,index)}))};
}

export function toCsv(payload) {
  const headings=['record_id','case_id','university_id','university_zh','university_en','reviewer','completed','decision','connection_type','network_view','ssid','original_category','proposed_category','official_source_url','evidence_quote','android_basis','notes','updated_at'];
  function cell(value) {
    let s=String(value ?? '');
    if (/^[\s]*[=+@-]/.test(s)) s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }
  const rows=payload.records.map(r=>[r.id,r.caseId,r.universityId,r.context.universityNameZh,r.context.universityName,r.reviewer,r.completed? 'yes':'draft',DECISIONS[r.decision] || '草稿',SCOPES[r.scope],r.view,r.ssid,r.context.originalCategory,r.category,r.sourceUrl,r.quote,r.androidBasis,r.notes,r.updatedAt]);
  return '\uFEFF'+[headings,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}

export function matchesSearch(item,university,query) {
  const words=query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const haystack=[university.name,university.nameZh,university.domain,item.id,item.ssid,item.label,item.reasonZh,item.category].filter(Boolean).join(' ').normalize('NFKC').toLowerCase();
  return words.every(word=>haystack.includes(word));
}
