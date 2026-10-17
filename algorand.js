import algosdk from 'https://esm.sh/algosdk@3.5.2';
import {PeraWalletConnect} from 'https://esm.sh/@perawallet/connect@1.6.0';
const wallet=new PeraWalletConnect({chainId:416002});
const algod=new algosdk.Algodv2('','https://testnet-api.algonode.cloud','');
let address=null;
const el=id=>document.getElementById(id);
const status=s=>el('chain-status').textContent=s;
const bytes=o=>new TextEncoder().encode(JSON.stringify(o));
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',v))].map(x=>x.toString(16).padStart(2,'0')).join('');
el('wallet-connect').onclick=async()=>{
try{address=(await wallet.connect())[0];status('Đã kết nối ví TestNet: '+address)}
catch(e){status('Không kết nối: '+e.message)}
};
wallet.reconnectSession().then(a=>{if(a.length){address=a[0];status('Đã kết nối: '+address)}}).catch(()=>{});
el('chain-send').onclick=async()=>{
const feature=window.geochainSelectedParcel?.();
if(!feature)return status('Chọn một thửa trước.');
if(!address)return status('Kết nối ví Pera TestNet trước.');
try{
const digest=await hash(bytes({schema:'geochain-parcel-v1',feature}));
const record={schema:'geochain-proof-v1',parcel_id:String(feature.properties.id),hash:digest};
const params=await algod.getTransactionParams().do();
const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({sender:address,receiver:address,amount:0,note:bytes(record),suggestedParams:params});
const atc=new algosdk.AtomicTransactionComposer();
atc.addTransaction({txn,signer:wallet.transactionSigner});
status('Đang yêu cầu ký giao dịch TestNet…');
const result=await atc.execute(algod,4),txid=result.txIDs?.[0];
status('Đã xác nhận trên TestNet · TXID: '+txid+' · Hash: '+digest);
const a=el('chain-explorer');a.href='https://testnet.explorer.perawallet.app/tx/'+encodeURIComponent(txid);a.hidden=false;a.textContent='Mở giao dịch TestNet';
}catch(e){status('Chưa ghi giao dịch: '+(e.message||String(e)))}
};
