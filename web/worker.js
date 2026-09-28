import {analyze_table} from './engine.mjs';
self.onmessage = ({data}) => {
  try { self.postMessage({id:data.id, result:JSON.parse(analyze_table(data.hands,data.board))}); }
  catch { self.postMessage({id:data.id,error:'计算失败，请检查牌面后重试。'}); }
};
