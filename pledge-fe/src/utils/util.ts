import BigNumber from 'bignumber.js';
import { getAddress } from '@ethersproject/address';

const specialAsset = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

// returns the checksummed address if the address is valid, otherwise returns false
function isAddress(value: any): string | false {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

/**
 * 获取地址栏参数 Get address bar parameters
 * @param {*} url
 */
function getUrlPrmt<T>(url?: string): T {
  url = url || window.location.href;
  const _pa = url.substring(url.indexOf('?') + 1);
  const _arrS = _pa.split('&');
  let _rs: T;
  for (let i = 0, _len = _arrS.length; i < _len; i++) {
    const pos = _arrS[i].indexOf('=');
    if (pos == -1) {
      continue;
    }
    const name = _arrS[i].substring(0, pos);
    const value = window.decodeURIComponent(_arrS[i].substring(pos + 1));
    _rs[name] = value;
  }
  return _rs;
}

function bin2Hex(str) {
  const re = /[\u4E00-\u9FA5]/;
  const ar = [];
  for (let i = 0; i < str.length; i++) {
    let a = '';
    if (re.test(str.charAt(i))) {
      // 中文
      a = encodeURI(str.charAt(i)).replace(/%g/, '');
    } else {
      a = str.charCodeAt(i).toString(16);
    }
    ar.push(a);
  }
  str = ar.join('');
  return str;
}

function getParams() {
  const url = new URL(window.location.href);
  // url.searchParams.get('hash');
  // console.log(URLSearchParams);
  return url.searchParams;
}

// 确定小数的精度
const calDecimalPrecision = (val, num) => {
  const x = new BigNumber(val);
  const y = new BigNumber(10 ** num);
  const newAmount = x.dividedBy(y).toFormat();
  return newAmount;
};

export { getUrlPrmt, getParams, bin2Hex, calDecimalPrecision, isAddress };
