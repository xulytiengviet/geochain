import algosdk from 'https://esm.sh/algosdk@3.5.2';
import LuteConnect from 'https://esm.sh/@galaxypay/lute-connect';
const lute=new LuteConnect();
const algod=new algosdk.Algodv2('','https://testnet-api.algonode.cloud','');
const $=id=>document.getElementById(id);
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
 try{const accounts=await lute.connect('testnet-v1.0');address=accounts[0]||null;msg(address?'Đã kết nối Lute trên TestNet: '+address:'Chưa chọn tài khoản');}
 catch(e){msg('Lỗi kết nối Lute: '+(e?.message||e))}
 refresh();
});
$('faucet').addEventListener('click',()=>{if(!address)return;const link='https://dispenser.testnet.aws.algodev.network/';navigator.clipboard?.writeText(address).catch(()=>{});window.open(link,'_blank','noopener');msg('Đã mở faucet TestNet và sao chép địa chỉ ví (nếu trình duyệt cho phép). Dán địa chỉ ví vào faucet để nhận ALGO thử nghiệm.')});
$('chain-send').addEventListener('click',async()=>{
 const feature=window.geochainSelectedParcel?.();if(!feature)return msg('Nhấp vào một polygon thửa đất trước.');if(!address)return msg('Kết nối Lute Wallet trước.');if(busy)return;
 busy=true;refresh();$('chain-explorer').hidden=true;
 try{
 const digest=await hex(encode({schema:'geochain-parcel-v1',feature}));
 const note=encode({v:1,p:String(feature.properties.id),h:digest});
 const params=await algod.getTransactionParams().do();
 const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0n,note,suggestedParams:params});
 const unsigned=base64(algosdk.encodeUnsignedTransaction(txn));
 msg('Xác nhận ký trên Lute TestNet…');
 const signed=await lute.signTxns([{txn:unsigned}]);
 if(!signed?.[0])throw Error('Ví không trả về chữ ký');
 const submitted=await algod.sendRawTransaction(unbase64(signed[0])).do();
 const txid=submitted.txid||submitted.txId||txn.txID();
 msg('Đã gửi: '+txid+' · Đang chờ xác nhận…');
 const confirmation=await algosdk.waitForConfirmation(algod,txid,8);
 const round=confirmation.confirmedRound??confirmation['confirmed-round'];
 if(!round)throw Error('Giao dịch chưa được xác nhận');
 msg('Đã xác nhận TestNet (round '+round+'). SHA-256: '+digest);
 const link=$('chain-explorer');link.href='https://lora.algokit.io/testnet/transaction/'+encodeURIComponent(txid);link.textContent='Xem giao dịch '+txid.slice(0,12)+'…';link.hidden=false;
 }catch(e){msg('Chưa hoàn tất: '+(e?.message||e))}
 finally{busy=false;refresh()}
});
refresh();
