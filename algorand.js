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
const base64=u8=>{let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)};
const unbase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const refresh=()=>{$('wallet-connect').textContent=address?'Lute: '+address.slice(0,7)+'…'+address.slice(-5):'Kết nối Lute Wallet';$('chain-send').disabled=busy||!address||!window.geochainSelectedParcel?.();$('faucet').hidden=!address};
window.addEventListener('geochain:parcel-selected',refresh);
$('wallet-connect').addEventListener('click',async()=>{
 if(address){address=null;msg('Đã ngắt phiên hiển thị. Kết nối lại Lute để ký.');refresh();return;}
 try{const accounts=await lute.connect('testnet-v1.0');const chosen=accounts.find(a=>a===MASTER);if(!chosen){address=null;throw Error('Hãy chọn ví chủ '+MASTER+' trong Lute (ví khác không được phép ghi)');}address=chosen;msg('Đã kết nối đúng ví chủ trên TestNet: '+address);}
 catch(e){msg('Lỗi kết nối Lute: '+(e?.message||e))}
 refresh();
});
$('faucet').addEventListener('click',()=>{if(!address)return;const link='https://dispenser.testnet.aws.algodev.network/';navigator.clipboard?.writeText(address).catch(()=>{});window.open(link,'_blank','noopener');msg('Đã mở faucet TestNet và sao chép địa chỉ ví (nếu trình duyệt cho phép). Dán địa chỉ ví vào faucet để nhận ALGO thử nghiệm.')});
$('chain-send').addEventListener('click',async()=>{
 const feature=window.geochainSelectedParcel?.();if(!feature)return msg('Nhấp vào một polygon thửa đất trước.');if(!address)return msg('Kết nối ví chủ Lute Wallet trước.');if(address!==MASTER)return msg('Chỉ ví chủ được ghi TestNet.');if(busy)return;
 busy=true;refresh();$('chain-explorer').hidden=true;
 try{
 const digest=await hex(encode({schema:'geochain-parcel-v1',feature}));
 const note=encode({v:1,p:String(feature.properties.id),h:digest});
 const params=await algod.getTransactionParams().do();
 const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0n,note,suggestedParams:params});
 const unsigned=base64(algosdk.encodeUnsignedTransaction(txn));
 msg('Xác nhận ký trên Lute TestNet…');
 const signed=await lute.signTxns([{txn:unsigned,signers:[MASTER]}]);
 if(!signed?.[0])throw Error('Ví không trả về chữ ký');
 const submitted=await algod.sendRawTransaction(unbase64(signed[0])).do();
 const txid=submitted.txid||submitted.txId||txn.txID();
 msg('Đã gửi: '+txid+' · Đang chờ xác nhận…');
 const confirmation=await algosdk.waitForConfirmation(algod,txid,8);
 const round=confirmation.confirmedRound??confirmation['confirmed-round'];
 if(!round)throw Error('Giao dịch chưa được xác nhận');
 msg('Đã xác nhận TestNet (round '+round+'). SHA-256: '+digest);
 const link=$('chain-explorer');link.href='https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(txid);link.textContent='Xem giao dịch '+txid.slice(0,12)+'…';link.hidden=false;
    await updateActivity();
 }catch(e){msg('Chưa hoàn tất: '+(e?.message||e))}
 finally{busy=false;refresh()}
});
refresh();


const indexerBase='https://testnet-idx.algonode.cloud';
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=seconds=>seconds?new Date(Number(seconds)*1000).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
const accountUrl='https://lora.algokit.io/testnet/account/'+MASTER;
async function updateActivity(){
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
 $('tx-summary').textContent='Hiển thị '+txs.length+' giao dịch gần nhất · '+MASTER.slice(0,9)+'…';
 const list=$('tx-list');list.replaceChildren();
 if(!txs.length){list.textContent='Chưa có giao dịch được Indexer trả về.';return}
 for(const tx of txs){
   const node=document.createElement('div');node.className='row';
   let geo=false;
   try{const note=tx.note?JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(tx.note),c=>c.charCodeAt(0)))):null;geo=note?.v===1&&typeof note?.p==='string'&&typeof note?.h==='string';}catch{}
   const id=String(tx.id||'');
   node.innerHTML='<div><strong>'+ (geo?'◈ GeoChain · ':'')+safe(tx['tx-type']||'Giao dịch')+'</strong> · '+safe(when(tx['round-time']))+'</div>'+
   '<div>Round '+safe(tx['confirmed-round'])+' · '+safe(tx.fee)+' µALGO</div>'+
   '<a target="_blank" rel="noopener noreferrer" href="https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(id)+'">'+safe(id.slice(0,18))+'…</a>';
   list.appendChild(node);
 }
 }catch(e){$('network-status').textContent='Không truy cập được Algod/Indexer: '+(e?.message||e);$('tx-summary').textContent='Không có dữ liệu mới';}
 finally{button.disabled=false}
}
$('tx-refresh').onclick=updateActivity;
updateActivity();
