import algosdk from 'https://esm.sh/algosdk@3.5.2';
import { PeraWalletConnect } from 'https://esm.sh/@perawallet/connect@1.8.0?external=algosdk';
const wallet = new PeraWalletConnect({chainId:416002});
const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
let address = null;
let sending = false;
const el = id => document.getElementById(id);
const status = message => {el('chain-status').textContent = message};
const encode = value => new TextEncoder().encode(JSON.stringify(value));
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),v=>v.toString(16).padStart(2,'0')).join('');
const refresh = () => {
  el('wallet-connect').textContent = address ? 'Ví: '+address.slice(0,6)+'…'+address.slice(-4) : 'Kết nối Pera Wallet';
  el('chain-send').disabled = sending || !address || !window.geochainSelectedParcel?.();
};
window.addEventListener('geochain:parcel-selected',refresh);
el('wallet-connect').onclick = async () => {
  try {
    if(address) { await wallet.disconnect(); address=null; status('Đã ngắt kết nối ví'); }
    else {const accounts=await wallet.connect(); address=accounts[0]||null; status(address?'Đã kết nối TestNet: '+address:'Không có tài khoản được chọn');}
  } catch(e) {status('Không kết nối được: '+(e.message||e));}
  refresh();
};
wallet.reconnectSession().then(accounts=>{if(accounts.length){address=accounts[0];status('Đã kết nối TestNet: '+address)}refresh()}).catch(()=>refresh());
el('chain-send').onclick = async () => {
  const feature=window.geochainSelectedParcel?.();
  if(!feature) return status('Nhấp vào một thửa đất trên bản đồ.');
  if(!address) return status('Hãy kết nối ví Pera trước.');
  if(sending) return;
  sending=true; refresh();
  try {
    const digest=await sha256(encode({schema:'geochain-parcel-v1',feature}));
    const note=encode({v:1,p:String(feature.properties.id),h:digest});
    const params=await algod.getTransactionParams().do();
    const txn=algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender:address,receiver:address,amount:0n,note,suggestedParams:params
    });
    status('Xác nhận giao dịch trong Pera Wallet (TestNet)…');
    const signed=await wallet.signTransaction([[{txn,signers:[address]}]]);
    const sent=await algod.sendRawTransaction(signed[0]).do();
    const txid=sent.txid || sent.txId || txn.txID();
    status('Đã gửi, đang chờ xác nhận TestNet: '+txid);
    const confirmed=await algosdk.waitForConfirmation(algod,txid,8);
    const round=confirmed.confirmedRound ?? confirmed['confirmed-round'];
    if(!round) throw new Error('Chưa tìm được xác nhận trên mạng');
    status('Thành công! TestNet xác nhận round '+round+' · Hash: '+digest);
    const link=el('chain-explorer');
    link.href='https://testnet.explorer.perawallet.app/tx/'+encodeURIComponent(txid);
    link.textContent='Xem giao dịch '+txid.slice(0,10)+'…';
    link.hidden=false;
  } catch(e) { status('Giao dịch chưa hoàn tất: '+(e.message||e));}
  finally {sending=false;refresh()}
};
refresh();
