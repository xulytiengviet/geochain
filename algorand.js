import algosdk from 'https://esm.sh/algosdk@3.5.2';
import LuteConnect from 'https://esm.sh/lute-connect';
const lute=new LuteConnect();
const algod=new algosdk.Algodv2('','https://testnet-api.algonode.cloud','');
const $=id=>document.getElementById(id);
const MASTER='6S4SCSMSK7OUJZPQCEKDQK7UT6IW3OVRDT4QN2CBBS4WC6WECDRS2YWC4I';
let address=null,busy=false;
const msg=s=>{$('chain-status').textContent=s};
const encode=v=>new TextEncoder().encode(JSON.stringify(v));
const hex=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',v)),b=>b.toString(16).padStart(2,'0')).join('');
const parcelPayload=f=>({schema:'geochain-parcel-v1',feature:f});
const parcelDigest=async f=>hex(encode(parcelPayload(f)));
window.geochainDigest=parcelDigest;
const base64=u8=>{let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)};
const signedBytes=value=>{if(value instanceof Uint8Array)return value;if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);if(value instanceof ArrayBuffer)return new Uint8Array(value);if(Array.isArray(value))return Uint8Array.from(value);throw Error('Lute phải trả về chữ ký nhị phân Uint8Array, không phải Base64.');};
const refresh=()=>{$('wallet-connect').textContent=address?'Lute: '+address.slice(0,7)+'…'+address.slice(-5):'Kết nối Lute Wallet';$('chain-send').disabled=busy||!window.geochainSelectedParcel?.();$('faucet').hidden=!address};
window.addEventListener('geochain:parcel-selected',refresh);
async function ensureMasterConnected(){
 if(address===MASTER)return MASTER;
 msg('Đang kết nối Lute Wallet với ví chủ trên TestNet…');
 const accounts=await lute.connect('testnet-v1.0');
 const authorized=(Array.isArray(accounts)?accounts:accounts?.addrs||[]).map(a=>typeof a==='string'?a:a?.address).filter(Boolean);
 if(!authorized.includes(MASTER)){
   address=null;refresh();
   throw Error('Lute chưa cấp quyền ký cho ví chủ 6S4S…WC4I. Hãy chọn đúng tài khoản trong cửa sổ Lute.');
 }
 address=MASTER;refresh();
 msg('Đã kết nối ví chủ. Sẵn sàng xác nhận giao dịch.');
 return MASTER;
}
$('wallet-connect').addEventListener('click',async()=>{
 try {
   if(address){address=null;msg('Đã ngắt kết nối hiển thị.');}
   else await ensureMasterConnected();
 }catch(e){msg('Không kết nối được Lute: '+(e?.message||e))}
 refresh();
});
$('faucet').addEventListener('click',()=>{if(!address)return;const link='https://dispenser.testnet.aws.algodev.network/';navigator.clipboard?.writeText(address).catch(()=>{});window.open(link,'_blank','noopener');msg('Đã mở faucet TestNet và sao chép địa chỉ ví (nếu trình duyệt cho phép). Dán địa chỉ ví vào faucet để nhận ALGO thử nghiệm.')});
$('chain-send').addEventListener('click',async()=>{
 const feature=window.geochainSelectedParcel?.();if(!feature)return msg('Nhấp vào một polygon thửa đất trước.');if(busy)return;
 busy=true;refresh();$('chain-explorer').hidden=true;
 let stage='kết nối ví';
 try{
 await ensureMasterConnected();
 stage='tạo SHA-256 và giao dịch';
 const digest=await parcelDigest(feature);
 const note=encode({v:1,p:String(feature.properties.id),h:digest});
 const params=await algod.getTransactionParams().do();
 const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0n,note,suggestedParams:params});
 const unsigned=base64(algosdk.encodeUnsignedTransaction(txn));
 msg('Xác nhận ký trên Lute TestNet…');
 const signed=await lute.signTxns([{txn:unsigned}]);
 if(!signed?.[0])throw Error('Ví không trả về chữ ký');
 stage='gửi giao dịch Algod';
 const submitted=await algod.sendRawTransaction(signedBytes(signed[0])).do();
 const txid=submitted.txid||submitted.txId||txn.txID();
 msg('Đã gửi: '+txid+' · Đang chờ xác nhận…');
 stage='chờ xác nhận';
 const confirmation=await algosdk.waitForConfirmation(algod,txid,8);
 const round=confirmation.confirmedRound??confirmation['confirmed-round'];
 if(!round)throw Error('Giao dịch chưa được xác nhận');
 msg('Đã xác nhận TestNet (round '+round+'). SHA-256: '+digest);
 const link=$('chain-explorer');link.href='https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(txid);link.textContent='Xem giao dịch '+txid.slice(0,12)+'…';link.hidden=false;
    await updateActivity();
 }catch(e){console.error('GeoChain TestNet',stage,e);msg('Chưa hoàn tất tại bước '+stage+': '+(e?.message||e)+'. Mở F12 → Console để xem vị trí lỗi.')}
 finally{busy=false;refresh()}
});
refresh();


const indexerBase='https://testnet-idx.algonode.cloud';
const fromBase64=txt=>{if(typeof txt!=='string')throw Error('Ghi chú không phải Base64');const cleaned=txt.trim().replace(/-/g,'+').replace(/_/g,'/');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned))throw Error('Ghi chú không hợp lệ');const padded=cleaned+'='.repeat((4-cleaned.length%4)%4);return Uint8Array.from(atob(padded),c=>c.charCodeAt(0))};
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=seconds=>seconds?new Date(Number(seconds)*1000).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
const accountUrl='https://lora.algokit.io/testnet/account/'+MASTER;

const REFERENCE_TX='RRXXC7LIVBYZBKZ5AHV5RNVHOP3QWQL3ABQRPOGOJ6SPAYW5FS5A';
const txDetailsUrl=id=>'https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(id);
function parseGeoNote(tx){
 try{
  if(!tx.note)return null;
  const raw=fromBase64(tx.note);
  const parsed=JSON.parse(new TextDecoder().decode(raw));
  return parsed?.v===1&&typeof parsed.p==='string'&&/^[0-9a-f]{64}$/i.test(parsed.h||'')?parsed:null;
 }catch{return null}
}
async function showReference(){
 const featured=$('tx-featured');
 try{
  const response=await fetch(indexerBase+'/v2/transactions/'+REFERENCE_TX);
  if(!response.ok)throw Error('HTTP '+response.status);
  const {transaction:t}=await response.json();
  if(!t||!(t.sender===MASTER||t['payment-transaction']?.receiver===MASTER))throw Error('Giao dịch không thuộc ví chủ');
  const note=parseGeoNote(t);
  const payment=t['payment-transaction']||{};
  const amount=(Number(payment.amount||0)/1e6).toLocaleString('vi-VN',{maximumFractionDigits:6});
  const fee=(Number(t.fee||0)/1e6).toLocaleString('vi-VN',{maximumFractionDigits:6});
  const sender=String(t.sender||'');
  const receiver=String(payment.receiver||'');
  let noteText='Không có ghi chú';
  try{if(t.note)noteText=new TextDecoder().decode(fromBase64(t.note))}catch{noteText='Không đọc được ghi chú UTF-8'}
  const linkAccount=id=>'<a href="https://lora.algokit.io/testnet/account/'+encodeURIComponent(id)+'" target="_blank" rel="noopener noreferrer">'+safe(id)+'</a>';
  featured.innerHTML='<div class="tx-head"><div><span class="tx-kicker">CHI TIẾT GIAO DỊCH · ALGORAND TESTNET</span><h4>Giao dịch chuyển ALGO</h4></div><span class="tx-badge">Đã xác nhận</span></div>'+
  '<div class="tx-metrics"><div><small>Số ALGO chuyển</small><strong>'+amount+' ALGO</strong></div><div><small>Phí mạng</small><strong>'+fee+' ALGO</strong></div><div><small>Khối xác nhận</small><strong><a target="_blank" rel="noopener noreferrer" href="https://lora.algokit.io/testnet/block/'+encodeURIComponent(t['confirmed-round'])+'">'+safe(t['confirmed-round'])+'</a></strong></div></div>'+
  '<div class="tx-flow"><div><small>VÍ GỬI</small>'+linkAccount(sender)+'</div><span class="tx-arrow">→</span><div><small>VÍ NHẬN</small>'+linkAccount(receiver)+'</div></div>'+
  '<dl class="tx-facts"><div><dt>Mã giao dịch</dt><dd><a target="_blank" rel="noopener noreferrer" href="'+txDetailsUrl(REFERENCE_TX)+'">'+REFERENCE_TX+'</a></dd></div><div><dt>Loại giao dịch</dt><dd>Chuyển ALGO (Payment)</dd></div><div><dt>Thời gian (Việt Nam)</dt><dd>'+safe(when(t['round-time']))+'</dd></div><div><dt>Ghi chú UTF-8</dt><dd>'+safe(noteText)+'</dd></div><div><dt>Đối chiếu hồ sơ GeoChain</dt><dd>'+(note?'Mã thửa: '+safe(note.p)+' · SHA-256: '+safe(note.h):'Chưa có mã thửa và SHA-256 trong ghi chú; đây không phải giao dịch xác thực thửa đất.')+'</dd></div></dl>'+
  '<a class="tx-open" target="_blank" rel="noopener noreferrer" href="'+txDetailsUrl(REFERENCE_TX)+'">Xem giao dịch gốc trên Lora ↗</a>';
 }catch(e){featured.textContent='Chưa đọc được giao dịch tham chiếu từ Indexer: '+(e?.message||e)}
}

let updating=false;
async function updateActivity(){
 if(updating)return;
 updating=true;
 const button=$('tx-refresh');button.disabled=true;$('tx-summary').textContent='Đang tải hoạt động TestNet…';
 try{
 const [health,acct,response]=await Promise.all([
   algod.status().do(),
   fetch(indexerBase+'/v2/accounts/'+MASTER).then(r=>{if(!r.ok)throw Error('Indexer account HTTP '+r.status);return r.json()}),
   fetch(indexerBase+'/v2/accounts/'+MASTER+'/transactions?limit=20').then(r=>{if(!r.ok)throw Error('Indexer transactions HTTP '+r.status);return r.json()})
 ]);
 $('network-status').textContent='● Algod + Indexer TestNet đã kết nối';
 $('algo-round').textContent=String(health.lastRound??health['last-round']??'—');
 const micro=acct.account?.amount??0;
 $('algo-balance').textContent=(Number(micro)/1e6).toLocaleString('vi-VN',{maximumFractionDigits:6});
 const txs=response.transactions||[];
 await showReference();
 $('tx-summary').textContent='Hiển thị '+txs.length+' giao dịch gần nhất · '+MASTER.slice(0,9)+'…';
 const list=$('tx-list');list.replaceChildren();
 if(!txs.length){list.textContent='Chưa có giao dịch được Indexer trả về.';return}
 for(const tx of txs){
   const node=document.createElement('div');node.className='row';
   const note=parseGeoNote(tx);const geo=!!note;
   const id=String(tx.id||'');
   node.innerHTML='<div><strong>'+ (geo?'◈ GeoChain · ':'')+safe(tx['tx-type']==='pay'?'Chuyển ALGO':tx['tx-type']==='axfer'?'Chuyển tài sản':tx['tx-type']==='appl'?'Ứng dụng hợp đồng':tx['tx-type']||'Giao dịch')+'</strong> · '+safe(when(tx['round-time']))+'</div>'+
   '<div>Round '+safe(tx['confirmed-round'])+' · Phí '+safe(Number(tx.fee||0)/1e6)+' ALGO</div>'+ (geo?'<div>Mã thửa: '+safe(note.p)+' · SHA-256: '+safe(note.h)+'</div>':'')+
   '<a target="_blank" rel="noopener noreferrer" href="https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(id)+'">'+safe(id.slice(0,18))+'…</a>';
   list.appendChild(node);
 }
 }catch(e){$('network-status').textContent='Không truy cập được Algod/Indexer: '+(e?.message||e);$('tx-summary').textContent='Không có dữ liệu mới';}
 finally{button.disabled=false;updating=false;const stamp=$('tx-updated');if(stamp)stamp.textContent='Cập nhật lần cuối: '+new Date().toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' · Tự kiểm tra mỗi 15 giây';}
}
$('tx-refresh').onclick=updateActivity;
updateActivity();
setInterval(()=>{if(document.visibilityState==='visible')updateActivity()},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateActivity()});
