/* empty css              */(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();const cf=()=>{};var gc={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nu=function(n){const e=[];let t=0;for(let s=0;s<n.length;s++){let r=n.charCodeAt(s);r<128?e[t++]=r:r<2048?(e[t++]=r>>6|192,e[t++]=r&63|128):(r&64512)===55296&&s+1<n.length&&(n.charCodeAt(s+1)&64512)===56320?(r=65536+((r&1023)<<10)+(n.charCodeAt(++s)&1023),e[t++]=r>>18|240,e[t++]=r>>12&63|128,e[t++]=r>>6&63|128,e[t++]=r&63|128):(e[t++]=r>>12|224,e[t++]=r>>6&63|128,e[t++]=r&63|128)}return e},lf=function(n){const e=[];let t=0,s=0;for(;t<n.length;){const r=n[t++];if(r<128)e[s++]=String.fromCharCode(r);else if(r>191&&r<224){const i=n[t++];e[s++]=String.fromCharCode((r&31)<<6|i&63)}else if(r>239&&r<365){const i=n[t++],a=n[t++],c=n[t++],u=((r&7)<<18|(i&63)<<12|(a&63)<<6|c&63)-65536;e[s++]=String.fromCharCode(55296+(u>>10)),e[s++]=String.fromCharCode(56320+(u&1023))}else{const i=n[t++],a=n[t++];e[s++]=String.fromCharCode((r&15)<<12|(i&63)<<6|a&63)}}return e.join("")},su={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let r=0;r<n.length;r+=3){const i=n[r],a=r+1<n.length,c=a?n[r+1]:0,u=r+2<n.length,d=u?n[r+2]:0,f=i>>2,p=(i&3)<<4|c>>4;let y=(c&15)<<2|d>>6,S=d&63;u||(S=64,a||(y=64)),s.push(t[f],t[p],t[y],t[S])}return s.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(nu(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):lf(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let r=0;r<n.length;){const i=t[n.charAt(r++)],c=r<n.length?t[n.charAt(r)]:0;++r;const d=r<n.length?t[n.charAt(r)]:64;++r;const p=r<n.length?t[n.charAt(r)]:64;if(++r,i==null||c==null||d==null||p==null)throw new uf;const y=i<<2|c>>4;if(s.push(y),d!==64){const S=c<<4&240|d>>2;if(s.push(S),p!==64){const P=d<<6&192|p;s.push(P)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class uf extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const hf=function(n){const e=nu(n);return su.encodeByteArray(e,!0)},ar=function(n){return hf(n).replace(/\./g,"")},ru=function(n){try{return su.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function df(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ff=()=>df().__FIREBASE_DEFAULTS__,mf=()=>{if(typeof process>"u"||typeof gc>"u")return;const n=gc.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},pf=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&ru(n[1]);return e&&JSON.parse(e)},Nr=()=>{try{return cf()||ff()||mf()||pf()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},iu=n=>Nr()?.emulatorHosts?.[n],To=n=>{const e=iu(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const s=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),s]:[e.substring(0,t),s]},ou=()=>Nr()?.config,au=n=>Nr()?.[`_${n}`];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gf{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,s)=>{t?this.reject(t):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,s))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dt(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Dr(n){return(await fetch(n,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cu(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},s=e||"demo-project",r=n.iat||0,i=n.sub||n.user_id;if(!i)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const a={iss:`https://securetoken.google.com/${s}`,aud:s,iat:r,exp:r+3600,auth_time:r,sub:i,user_id:i,firebase:{sign_in_provider:"custom",identities:{}},...n};return[ar(JSON.stringify(t)),ar(JSON.stringify(a)),""].join(".")}const Yn={};function _f(){const n={prod:[],emulator:[]};for(const e of Object.keys(Yn))Yn[e]?n.emulator.push(e):n.prod.push(e);return n}function yf(n){let e=document.getElementById(n),t=!1;return e||(e=document.createElement("div"),e.setAttribute("id",n),t=!0),{created:t,element:e}}let _c=!1;function Lr(n,e){if(typeof window>"u"||typeof document>"u"||!dt(window.location.host)||Yn[n]===e||Yn[n]||_c)return;Yn[n]=e;function t(y){return`__firebase__banner__${y}`}const s="__firebase__banner",i=_f().prod.length>0;function a(){const y=document.getElementById(s);y&&y.remove()}function c(y){y.style.display="flex",y.style.background="#7faaf0",y.style.position="fixed",y.style.bottom="5px",y.style.left="5px",y.style.padding=".5em",y.style.borderRadius="5px",y.style.alignItems="center"}function u(y,S){y.setAttribute("width","24"),y.setAttribute("id",S),y.setAttribute("height","24"),y.setAttribute("viewBox","0 0 24 24"),y.setAttribute("fill","none"),y.style.marginLeft="-6px"}function d(){const y=document.createElement("span");return y.style.cursor="pointer",y.style.marginLeft="16px",y.style.fontSize="24px",y.innerHTML=" &times;",y.onclick=()=>{_c=!0,a()},y}function f(y,S){y.setAttribute("id",S),y.innerText="Learn more",y.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",y.setAttribute("target","__blank"),y.style.paddingLeft="5px",y.style.textDecoration="underline"}function p(){const y=yf(s),S=t("text"),P=document.getElementById(S)||document.createElement("span"),D=t("learnmore"),k=document.getElementById(D)||document.createElement("a"),j=t("preprendIcon"),K=document.getElementById(j)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(y.created){const H=y.element;c(H),f(k,D);const X=d();u(K,j),H.append(K,P,k,X),document.body.appendChild(H)}i?(P.innerText="Preview backend disconnected.",K.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(K.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,P.innerText="Preview backend running in this workspace."),P.setAttribute("id",S)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",p):p()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function be(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Ef(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(be())}function If(){const n=Nr()?.forceEnvironment;if(n==="node")return!0;if(n==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function vf(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Tf(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function wf(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Af(){const n=be();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function bf(){return!If()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function Sf(){try{return typeof indexedDB=="object"}catch{return!1}}function Rf(){return new Promise((n,e)=>{try{let t=!0;const s="validate-browser-context-for-indexeddb-analytics-module",r=self.indexedDB.open(s);r.onsuccess=()=>{r.result.close(),t||self.indexedDB.deleteDatabase(s),n(!0)},r.onupgradeneeded=()=>{t=!1},r.onerror=()=>{e(r.error?.message||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Cf="FirebaseError";class qe extends Error{constructor(e,t,s){super(t),this.code=e,this.customData=s,this.name=Cf,Object.setPrototypeOf(this,qe.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,fs.prototype.create)}}class fs{constructor(e,t,s){this.service=e,this.serviceName=t,this.errors=s}create(e,...t){const s=t[0]||{},r=`${this.service}/${e}`,i=this.errors[e],a=i?Pf(i,s):"Error",c=`${this.serviceName}: ${a} (${r}).`;return new qe(r,c,s)}}function Pf(n,e){return n.replace(kf,(t,s)=>{const r=e[s];return r!=null?String(r):`<${s}?>`})}const kf=/\{\$([^}]+)}/g;function Vf(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function Yt(n,e){if(n===e)return!0;const t=Object.keys(n),s=Object.keys(e);for(const r of t){if(!s.includes(r))return!1;const i=n[r],a=e[r];if(yc(i)&&yc(a)){if(!Yt(i,a))return!1}else if(i!==a)return!1}for(const r of s)if(!t.includes(r))return!1;return!0}function yc(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ms(n){const e=[];for(const[t,s]of Object.entries(n))Array.isArray(s)?s.forEach(r=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(r))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(s));return e.length?"&"+e.join("&"):""}function Nf(n,e){const t=new Df(n,e);return t.subscribe.bind(t)}class Df{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(s=>{this.error(s)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,s){let r;if(e===void 0&&t===void 0&&s===void 0)throw new Error("Missing Observer.");Lf(e,["next","error","complete"])?r=e:r={next:e,error:t,complete:s},r.next===void 0&&(r.next=Li),r.error===void 0&&(r.error=Li),r.complete===void 0&&(r.complete=Li);const i=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?r.error(this.finalError):r.complete()}catch{}}),this.observers.push(r),i}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(s){typeof console<"u"&&console.error&&console.error(s)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Lf(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function Li(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ie(n){return n&&n._delegate?n._delegate:n}class it{constructor(e,t,s){this.name=e,this.instanceFactory=t,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Wt="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mf{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const s=new gf;if(this.instancesDeferred.set(t,s),this.isInitialized(t)||this.shouldAutoInitialize())try{const r=this.getOrInitializeService({instanceIdentifier:t});r&&s.resolve(r)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e?.identifier),s=e?.optional??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(r){if(s)return null;throw r}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(xf(e))try{this.getOrInitializeService({instanceIdentifier:Wt})}catch{}for(const[t,s]of this.instancesDeferred.entries()){const r=this.normalizeInstanceIdentifier(t);try{const i=this.getOrInitializeService({instanceIdentifier:r});s.resolve(i)}catch{}}}}clearInstance(e=Wt){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Wt){return this.instances.has(e)}getOptions(e=Wt){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const r=this.getOrInitializeService({instanceIdentifier:s,options:t});for(const[i,a]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(i);s===c&&a.resolve(r)}return r}onInit(e,t){const s=this.normalizeInstanceIdentifier(t),r=this.onInitCallbacks.get(s)??new Set;r.add(e),this.onInitCallbacks.set(s,r);const i=this.instances.get(s);return i&&e(i,s),()=>{r.delete(e)}}invokeOnInitCallbacks(e,t){const s=this.onInitCallbacks.get(t);if(s)for(const r of s)try{r(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:Of(e),options:t}),this.instances.set(e,s),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=Wt){return this.component?this.component.multipleInstances?e:Wt:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Of(n){return n===Wt?void 0:n}function xf(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uf{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new Mf(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var z;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(z||(z={}));const Ff={debug:z.DEBUG,verbose:z.VERBOSE,info:z.INFO,warn:z.WARN,error:z.ERROR,silent:z.SILENT},Bf=z.INFO,jf={[z.DEBUG]:"log",[z.VERBOSE]:"log",[z.INFO]:"info",[z.WARN]:"warn",[z.ERROR]:"error"},$f=(n,e,...t)=>{if(e<n.logLevel)return;const s=new Date().toISOString(),r=jf[e];if(r)console[r](`[${s}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class wo{constructor(e){this.name=e,this._logLevel=Bf,this._logHandler=$f,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in z))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Ff[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,z.DEBUG,...e),this._logHandler(this,z.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,z.VERBOSE,...e),this._logHandler(this,z.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,z.INFO,...e),this._logHandler(this,z.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,z.WARN,...e),this._logHandler(this,z.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,z.ERROR,...e),this._logHandler(this,z.ERROR,...e)}}const qf=(n,e)=>e.some(t=>n instanceof t);let Ec,Ic;function Hf(){return Ec||(Ec=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function zf(){return Ic||(Ic=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const lu=new WeakMap,Ki=new WeakMap,uu=new WeakMap,Mi=new WeakMap,Ao=new WeakMap;function Gf(n){const e=new Promise((t,s)=>{const r=()=>{n.removeEventListener("success",i),n.removeEventListener("error",a)},i=()=>{t(St(n.result)),r()},a=()=>{s(n.error),r()};n.addEventListener("success",i),n.addEventListener("error",a)});return e.then(t=>{t instanceof IDBCursor&&lu.set(t,n)}).catch(()=>{}),Ao.set(e,n),e}function Wf(n){if(Ki.has(n))return;const e=new Promise((t,s)=>{const r=()=>{n.removeEventListener("complete",i),n.removeEventListener("error",a),n.removeEventListener("abort",a)},i=()=>{t(),r()},a=()=>{s(n.error||new DOMException("AbortError","AbortError")),r()};n.addEventListener("complete",i),n.addEventListener("error",a),n.addEventListener("abort",a)});Ki.set(n,e)}let Qi={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Ki.get(n);if(e==="objectStoreNames")return n.objectStoreNames||uu.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return St(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Kf(n){Qi=n(Qi)}function Qf(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const s=n.call(Oi(this),e,...t);return uu.set(s,e.sort?e.sort():[e]),St(s)}:zf().includes(n)?function(...e){return n.apply(Oi(this),e),St(lu.get(this))}:function(...e){return St(n.apply(Oi(this),e))}}function Jf(n){return typeof n=="function"?Qf(n):(n instanceof IDBTransaction&&Wf(n),qf(n,Hf())?new Proxy(n,Qi):n)}function St(n){if(n instanceof IDBRequest)return Gf(n);if(Mi.has(n))return Mi.get(n);const e=Jf(n);return e!==n&&(Mi.set(n,e),Ao.set(e,n)),e}const Oi=n=>Ao.get(n);function Xf(n,e,{blocked:t,upgrade:s,blocking:r,terminated:i}={}){const a=indexedDB.open(n,e),c=St(a);return s&&a.addEventListener("upgradeneeded",u=>{s(St(a.result),u.oldVersion,u.newVersion,St(a.transaction),u)}),t&&a.addEventListener("blocked",u=>t(u.oldVersion,u.newVersion,u)),c.then(u=>{i&&u.addEventListener("close",()=>i()),r&&u.addEventListener("versionchange",d=>r(d.oldVersion,d.newVersion,d))}).catch(()=>{}),c}const Yf=["get","getKey","getAll","getAllKeys","count"],Zf=["put","add","delete","clear"],xi=new Map;function vc(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(xi.get(e))return xi.get(e);const t=e.replace(/FromIndex$/,""),s=e!==t,r=Zf.includes(t);if(!(t in(s?IDBIndex:IDBObjectStore).prototype)||!(r||Yf.includes(t)))return;const i=async function(a,...c){const u=this.transaction(a,r?"readwrite":"readonly");let d=u.store;return s&&(d=d.index(c.shift())),(await Promise.all([d[t](...c),r&&u.done]))[0]};return xi.set(e,i),i}Kf(n=>({...n,get:(e,t,s)=>vc(e,t)||n.get(e,t,s),has:(e,t)=>!!vc(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class em{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(tm(t)){const s=t.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(t=>t).join(" ")}}function tm(n){return n.getComponent()?.type==="VERSION"}const Ji="@firebase/app",Tc="0.14.4";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ot=new wo("@firebase/app"),nm="@firebase/app-compat",sm="@firebase/analytics-compat",rm="@firebase/analytics",im="@firebase/app-check-compat",om="@firebase/app-check",am="@firebase/auth",cm="@firebase/auth-compat",lm="@firebase/database",um="@firebase/data-connect",hm="@firebase/database-compat",dm="@firebase/functions",fm="@firebase/functions-compat",mm="@firebase/installations",pm="@firebase/installations-compat",gm="@firebase/messaging",_m="@firebase/messaging-compat",ym="@firebase/performance",Em="@firebase/performance-compat",Im="@firebase/remote-config",vm="@firebase/remote-config-compat",Tm="@firebase/storage",wm="@firebase/storage-compat",Am="@firebase/firestore",bm="@firebase/ai",Sm="@firebase/firestore-compat",Rm="firebase",Cm="12.4.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xi="[DEFAULT]",Pm={[Ji]:"fire-core",[nm]:"fire-core-compat",[rm]:"fire-analytics",[sm]:"fire-analytics-compat",[om]:"fire-app-check",[im]:"fire-app-check-compat",[am]:"fire-auth",[cm]:"fire-auth-compat",[lm]:"fire-rtdb",[um]:"fire-data-connect",[hm]:"fire-rtdb-compat",[dm]:"fire-fn",[fm]:"fire-fn-compat",[mm]:"fire-iid",[pm]:"fire-iid-compat",[gm]:"fire-fcm",[_m]:"fire-fcm-compat",[ym]:"fire-perf",[Em]:"fire-perf-compat",[Im]:"fire-rc",[vm]:"fire-rc-compat",[Tm]:"fire-gcs",[wm]:"fire-gcs-compat",[Am]:"fire-fst",[Sm]:"fire-fst-compat",[bm]:"fire-vertex","fire-js":"fire-js",[Rm]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cr=new Map,km=new Map,Yi=new Map;function wc(n,e){try{n.container.addComponent(e)}catch(t){ot.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function Vt(n){const e=n.name;if(Yi.has(e))return ot.debug(`There were multiple attempts to register component ${e}.`),!1;Yi.set(e,n);for(const t of cr.values())wc(t,n);for(const t of km.values())wc(t,n);return!0}function ps(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function Le(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vm={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Rt=new fs("app","Firebase",Vm);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nm{constructor(e,t,s){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new it("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Rt.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nn=Cm;function hu(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const s={name:Xi,automaticDataCollectionEnabled:!0,...e},r=s.name;if(typeof r!="string"||!r)throw Rt.create("bad-app-name",{appName:String(r)});if(t||(t=ou()),!t)throw Rt.create("no-options");const i=cr.get(r);if(i){if(Yt(t,i.options)&&Yt(s,i.config))return i;throw Rt.create("duplicate-app",{appName:r})}const a=new Uf(r);for(const u of Yi.values())a.addComponent(u);const c=new Nm(t,s,a);return cr.set(r,c),c}function Mr(n=Xi){const e=cr.get(n);if(!e&&n===Xi&&ou())return hu();if(!e)throw Rt.create("no-app",{appName:n});return e}function Fe(n,e,t){let s=Pm[n]??n;t&&(s+=`-${t}`);const r=s.match(/\s|\//),i=e.match(/\s|\//);if(r||i){const a=[`Unable to register library "${s}" with version "${e}":`];r&&a.push(`library name "${s}" contains illegal characters (whitespace or "/")`),r&&i&&a.push("and"),i&&a.push(`version name "${e}" contains illegal characters (whitespace or "/")`),ot.warn(a.join(" "));return}Vt(new it(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dm="firebase-heartbeat-database",Lm=1,rs="firebase-heartbeat-store";let Ui=null;function du(){return Ui||(Ui=Xf(Dm,Lm,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(rs)}catch(t){console.warn(t)}}}}).catch(n=>{throw Rt.create("idb-open",{originalErrorMessage:n.message})})),Ui}async function Mm(n){try{const t=(await du()).transaction(rs),s=await t.objectStore(rs).get(fu(n));return await t.done,s}catch(e){if(e instanceof qe)ot.warn(e.message);else{const t=Rt.create("idb-get",{originalErrorMessage:e?.message});ot.warn(t.message)}}}async function Ac(n,e){try{const s=(await du()).transaction(rs,"readwrite");await s.objectStore(rs).put(e,fu(n)),await s.done}catch(t){if(t instanceof qe)ot.warn(t.message);else{const s=Rt.create("idb-set",{originalErrorMessage:t?.message});ot.warn(s.message)}}}function fu(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Om=1024,xm=30;class Um{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Bm(t),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){try{const t=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=bc();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(r=>r.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:t}),this._heartbeatsCache.heartbeats.length>xm){const r=jm(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(r,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(e){ot.warn(e)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const e=bc(),{heartbeatsToSend:t,unsentEntries:s}=Fm(this._heartbeatsCache.heartbeats),r=ar(JSON.stringify({version:2,heartbeats:t}));return this._heartbeatsCache.lastSentHeartbeatDate=e,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(e){return ot.warn(e),""}}}function bc(){return new Date().toISOString().substring(0,10)}function Fm(n,e=Om){const t=[];let s=n.slice();for(const r of n){const i=t.find(a=>a.agent===r.agent);if(i){if(i.dates.push(r.date),Sc(t)>e){i.dates.pop();break}}else if(t.push({agent:r.agent,dates:[r.date]}),Sc(t)>e){t.pop();break}s=s.slice(1)}return{heartbeatsToSend:t,unsentEntries:s}}class Bm{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Sf()?Rf().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await Mm(this.app);return t?.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Ac(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Ac(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...e.heartbeats]})}else return}}function Sc(n){return ar(JSON.stringify({version:2,heartbeats:n})).length}function jm(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let s=1;s<n.length;s++)n[s].date<t&&(t=n[s].date,e=s);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $m(n){Vt(new it("platform-logger",e=>new em(e),"PRIVATE")),Vt(new it("heartbeat",e=>new Um(e),"PRIVATE")),Fe(Ji,Tc,n),Fe(Ji,Tc,"esm2020"),Fe("fire-js","")}$m("");var qm="firebase",Hm="12.4.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Fe(qm,Hm,"app");function mu(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const zm=mu,pu=new fs("auth","Firebase",mu());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lr=new wo("@firebase/auth");function Gm(n,...e){lr.logLevel<=z.WARN&&lr.warn(`Auth (${nn}): ${n}`,...e)}function Xs(n,...e){lr.logLevel<=z.ERROR&&lr.error(`Auth (${nn}): ${n}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function at(n,...e){throw bo(n,...e)}function We(n,...e){return bo(n,...e)}function gu(n,e,t){const s={...zm(),[e]:t};return new fs("auth","Firebase",s).create(e,{appName:n.name})}function Ct(n){return gu(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function bo(n,...e){if(typeof n!="string"){const t=e[0],s=[...e.slice(1)];return s[0]&&(s[0].appName=n.name),n._errorFactory.create(t,...s)}return pu.create(n,...e)}function U(n,e,...t){if(!n)throw bo(e,...t)}function nt(n){const e="INTERNAL ASSERTION FAILED: "+n;throw Xs(e),new Error(e)}function ct(n,e){n||nt(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zi(){return typeof self<"u"&&self.location?.href||""}function Wm(){return Rc()==="http:"||Rc()==="https:"}function Rc(){return typeof self<"u"&&self.location?.protocol||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Km(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Wm()||Tf()||"connection"in navigator)?navigator.onLine:!0}function Qm(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gs{constructor(e,t){this.shortDelay=e,this.longDelay=t,ct(t>e,"Short delay should be less than long delay!"),this.isMobile=Ef()||wf()}get(){return Km()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function So(n,e){ct(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _u{static initialize(e,t,s){this.fetchImpl=e,t&&(this.headersImpl=t),s&&(this.responseImpl=s)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;nt("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;nt("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;nt("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jm={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xm=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Ym=new gs(3e4,6e4);function Or(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function Sn(n,e,t,s,r={}){return yu(n,r,async()=>{let i={},a={};s&&(e==="GET"?a=s:i={body:JSON.stringify(s)});const c=ms({key:n.config.apiKey,...a}).slice(1),u=await n._getAdditionalHeaders();u["Content-Type"]="application/json",n.languageCode&&(u["X-Firebase-Locale"]=n.languageCode);const d={method:e,headers:u,...i};return vf()||(d.referrerPolicy="no-referrer"),n.emulatorConfig&&dt(n.emulatorConfig.host)&&(d.credentials="include"),_u.fetch()(await Iu(n,n.config.apiHost,t,c),d)})}async function yu(n,e,t){n._canInitEmulator=!1;const s={...Jm,...e};try{const r=new Zm(n),i=await Promise.race([t(),r.promise]);r.clearNetworkTimeout();const a=await i.json();if("needConfirmation"in a)throw Hs(n,"account-exists-with-different-credential",a);if(i.ok&&!("errorMessage"in a))return a;{const c=i.ok?a.errorMessage:a.error.message,[u,d]=c.split(" : ");if(u==="FEDERATED_USER_ID_ALREADY_LINKED")throw Hs(n,"credential-already-in-use",a);if(u==="EMAIL_EXISTS")throw Hs(n,"email-already-in-use",a);if(u==="USER_DISABLED")throw Hs(n,"user-disabled",a);const f=s[u]||u.toLowerCase().replace(/[_\s]+/g,"-");if(d)throw gu(n,f,d);at(n,f)}}catch(r){if(r instanceof qe)throw r;at(n,"network-request-failed",{message:String(r)})}}async function Eu(n,e,t,s,r={}){const i=await Sn(n,e,t,s,r);return"mfaPendingCredential"in i&&at(n,"multi-factor-auth-required",{_serverResponse:i}),i}async function Iu(n,e,t,s){const r=`${e}${t}?${s}`,i=n,a=i.config.emulator?So(n.config,r):`${n.config.apiScheme}://${r}`;return Xm.includes(t)&&(await i._persistenceManagerAvailable,i._getPersistenceType()==="COOKIE")?i._getPersistence()._getFinalTarget(a).toString():a}class Zm{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,s)=>{this.timer=setTimeout(()=>s(We(this.auth,"network-request-failed")),Ym.get())})}}function Hs(n,e,t){const s={appName:n.name};t.email&&(s.email=t.email),t.phoneNumber&&(s.phoneNumber=t.phoneNumber);const r=We(n,e,s);return r.customData._tokenResponse=t,r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ep(n,e){return Sn(n,"POST","/v1/accounts:delete",e)}async function ur(n,e){return Sn(n,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zn(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function tp(n,e=!1){const t=ie(n),s=await t.getIdToken(e),r=Ro(s);U(r&&r.exp&&r.auth_time&&r.iat,t.auth,"internal-error");const i=typeof r.firebase=="object"?r.firebase:void 0,a=i?.sign_in_provider;return{claims:r,token:s,authTime:Zn(Fi(r.auth_time)),issuedAtTime:Zn(Fi(r.iat)),expirationTime:Zn(Fi(r.exp)),signInProvider:a||null,signInSecondFactor:i?.sign_in_second_factor||null}}function Fi(n){return Number(n)*1e3}function Ro(n){const[e,t,s]=n.split(".");if(e===void 0||t===void 0||s===void 0)return Xs("JWT malformed, contained fewer than 3 sections"),null;try{const r=ru(t);return r?JSON.parse(r):(Xs("Failed to decode base64 JWT payload"),null)}catch(r){return Xs("Caught error parsing JWT payload as JSON",r?.toString()),null}}function Cc(n){const e=Ro(n);return U(e,"internal-error"),U(typeof e.exp<"u","internal-error"),U(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function is(n,e,t=!1){if(t)return e;try{return await e}catch(s){throw s instanceof qe&&np(s)&&n.auth.currentUser===n&&await n.auth.signOut(),s}}function np({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sp{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const s=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,s)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){e?.code==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class eo{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=Zn(this.lastLoginAt),this.creationTime=Zn(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hr(n){const e=n.auth,t=await n.getIdToken(),s=await is(n,ur(e,{idToken:t}));U(s?.users.length,e,"internal-error");const r=s.users[0];n._notifyReloadListener(r);const i=r.providerUserInfo?.length?vu(r.providerUserInfo):[],a=ip(n.providerData,i),c=n.isAnonymous,u=!(n.email&&r.passwordHash)&&!a?.length,d=c?u:!1,f={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:a,metadata:new eo(r.createdAt,r.lastLoginAt),isAnonymous:d};Object.assign(n,f)}async function rp(n){const e=ie(n);await hr(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function ip(n,e){return[...n.filter(s=>!e.some(r=>r.providerId===s.providerId)),...e]}function vu(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function op(n,e){const t=await yu(n,{},async()=>{const s=ms({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:r,apiKey:i}=n.config,a=await Iu(n,r,"/v1/token",`key=${i}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const u={method:"POST",headers:c,body:s};return n.emulatorConfig&&dt(n.emulatorConfig.host)&&(u.credentials="include"),_u.fetch()(a,u)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function ap(n,e){return Sn(n,"POST","/v2/accounts:revokeToken",Or(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pn{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){U(e.idToken,"internal-error"),U(typeof e.idToken<"u","internal-error"),U(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Cc(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){U(e.length!==0,"internal-error");const t=Cc(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(U(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:s,refreshToken:r,expiresIn:i}=await op(e,t);this.updateTokensAndExpiration(s,r,Number(i))}updateTokensAndExpiration(e,t,s){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+s*1e3}static fromJSON(e,t){const{refreshToken:s,accessToken:r,expirationTime:i}=t,a=new pn;return s&&(U(typeof s=="string","internal-error",{appName:e}),a.refreshToken=s),r&&(U(typeof r=="string","internal-error",{appName:e}),a.accessToken=r),i&&(U(typeof i=="number","internal-error",{appName:e}),a.expirationTime=i),a}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new pn,this.toJSON())}_performRefresh(){return nt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Et(n,e){U(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class Be{constructor({uid:e,auth:t,stsTokenManager:s,...r}){this.providerId="firebase",this.proactiveRefresh=new sp(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=s,this.accessToken=s.accessToken,this.displayName=r.displayName||null,this.email=r.email||null,this.emailVerified=r.emailVerified||!1,this.phoneNumber=r.phoneNumber||null,this.photoURL=r.photoURL||null,this.isAnonymous=r.isAnonymous||!1,this.tenantId=r.tenantId||null,this.providerData=r.providerData?[...r.providerData]:[],this.metadata=new eo(r.createdAt||void 0,r.lastLoginAt||void 0)}async getIdToken(e){const t=await is(this,this.stsTokenManager.getToken(this.auth,e));return U(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return tp(this,e)}reload(){return rp(this)}_assign(e){this!==e&&(U(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new Be({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){U(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let s=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),s=!0),t&&await hr(this),await this.auth._persistUserIfCurrent(this),s&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(Le(this.auth.app))return Promise.reject(Ct(this.auth));const e=await this.getIdToken();return await is(this,ep(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const s=t.displayName??void 0,r=t.email??void 0,i=t.phoneNumber??void 0,a=t.photoURL??void 0,c=t.tenantId??void 0,u=t._redirectEventId??void 0,d=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:p,emailVerified:y,isAnonymous:S,providerData:P,stsTokenManager:D}=t;U(p&&D,e,"internal-error");const k=pn.fromJSON(this.name,D);U(typeof p=="string",e,"internal-error"),Et(s,e.name),Et(r,e.name),U(typeof y=="boolean",e,"internal-error"),U(typeof S=="boolean",e,"internal-error"),Et(i,e.name),Et(a,e.name),Et(c,e.name),Et(u,e.name),Et(d,e.name),Et(f,e.name);const j=new Be({uid:p,auth:e,email:r,emailVerified:y,displayName:s,isAnonymous:S,photoURL:a,phoneNumber:i,tenantId:c,stsTokenManager:k,createdAt:d,lastLoginAt:f});return P&&Array.isArray(P)&&(j.providerData=P.map(K=>({...K}))),u&&(j._redirectEventId=u),j}static async _fromIdTokenResponse(e,t,s=!1){const r=new pn;r.updateFromServerResponse(t);const i=new Be({uid:t.localId,auth:e,stsTokenManager:r,isAnonymous:s});return await hr(i),i}static async _fromGetAccountInfoResponse(e,t,s){const r=t.users[0];U(r.localId!==void 0,"internal-error");const i=r.providerUserInfo!==void 0?vu(r.providerUserInfo):[],a=!(r.email&&r.passwordHash)&&!i?.length,c=new pn;c.updateFromIdToken(s);const u=new Be({uid:r.localId,auth:e,stsTokenManager:c,isAnonymous:a}),d={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:i,metadata:new eo(r.createdAt,r.lastLoginAt),isAnonymous:!(r.email&&r.passwordHash)&&!i?.length};return Object.assign(u,d),u}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pc=new Map;function st(n){ct(n instanceof Function,"Expected a class definition");let e=Pc.get(n);return e?(ct(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Pc.set(n,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tu{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}Tu.type="NONE";const kc=Tu;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ys(n,e,t){return`firebase:${n}:${e}:${t}`}class gn{constructor(e,t,s){this.persistence=e,this.auth=t,this.userKey=s;const{config:r,name:i}=this.auth;this.fullUserKey=Ys(this.userKey,r.apiKey,i),this.fullPersistenceKey=Ys("persistence",r.apiKey,i),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await ur(this.auth,{idToken:e}).catch(()=>{});return t?Be._fromGetAccountInfoResponse(this.auth,t,e):null}return Be._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,s="authUser"){if(!t.length)return new gn(st(kc),e,s);const r=(await Promise.all(t.map(async d=>{if(await d._isAvailable())return d}))).filter(d=>d);let i=r[0]||st(kc);const a=Ys(s,e.config.apiKey,e.name);let c=null;for(const d of t)try{const f=await d._get(a);if(f){let p;if(typeof f=="string"){const y=await ur(e,{idToken:f}).catch(()=>{});if(!y)break;p=await Be._fromGetAccountInfoResponse(e,y,f)}else p=Be._fromJSON(e,f);d!==i&&(c=p),i=d;break}}catch{}const u=r.filter(d=>d._shouldAllowMigration);return!i._shouldAllowMigration||!u.length?new gn(i,e,s):(i=u[0],c&&await i._set(a,c.toJSON()),await Promise.all(t.map(async d=>{if(d!==i)try{await d._remove(a)}catch{}})),new gn(i,e,s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vc(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Su(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(wu(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Cu(e))return"Blackberry";if(Pu(e))return"Webos";if(Au(e))return"Safari";if((e.includes("chrome/")||bu(e))&&!e.includes("edge/"))return"Chrome";if(Ru(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,s=n.match(t);if(s?.length===2)return s[1]}return"Other"}function wu(n=be()){return/firefox\//i.test(n)}function Au(n=be()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function bu(n=be()){return/crios\//i.test(n)}function Su(n=be()){return/iemobile/i.test(n)}function Ru(n=be()){return/android/i.test(n)}function Cu(n=be()){return/blackberry/i.test(n)}function Pu(n=be()){return/webos/i.test(n)}function Co(n=be()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function cp(n=be()){return Co(n)&&!!window.navigator?.standalone}function lp(){return Af()&&document.documentMode===10}function ku(n=be()){return Co(n)||Ru(n)||Pu(n)||Cu(n)||/windows phone/i.test(n)||Su(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vu(n,e=[]){let t;switch(n){case"Browser":t=Vc(be());break;case"Worker":t=`${Vc(be())}-${n}`;break;default:t=n}const s=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${nn}/${s}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class up{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const s=i=>new Promise((a,c)=>{try{const u=e(i);a(u)}catch(u){c(u)}});s.onAbort=t,this.queue.push(s);const r=this.queue.length-1;return()=>{this.queue[r]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const s of this.queue)await s(e),s.onAbort&&t.push(s.onAbort)}catch(s){t.reverse();for(const r of t)try{r()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:s?.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hp(n,e={}){return Sn(n,"GET","/v2/passwordPolicy",Or(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dp=6;class fp{constructor(e){const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??dp,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=e.allowedNonAlphanumericCharacters?.join("")??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const s=this.customStrengthOptions.minPasswordLength,r=this.customStrengthOptions.maxPasswordLength;s&&(t.meetsMinPasswordLength=e.length>=s),r&&(t.meetsMaxPasswordLength=e.length<=r)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let s;for(let r=0;r<e.length;r++)s=e.charAt(r),this.updatePasswordCharacterOptionsStatuses(t,s>="a"&&s<="z",s>="A"&&s<="Z",s>="0"&&s<="9",this.allowedNonAlphanumericCharacters.includes(s))}updatePasswordCharacterOptionsStatuses(e,t,s,r,i){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=s)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=r)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=i))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mp{constructor(e,t,s,r){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=s,this.config=r,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Nc(this),this.idTokenSubscription=new Nc(this),this.beforeStateQueue=new up(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=pu,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=r.sdkClientVersion,this._persistenceManagerAvailable=new Promise(i=>this._resolvePersistenceManagerAvailable=i)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=st(t)),this._initializationPromise=this.queue(async()=>{if(!this._deleted&&(this.persistenceManager=await gn.create(this,e),this._resolvePersistenceManagerAvailable?.(),!this._deleted)){if(this._popupRedirectResolver?._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=this.currentUser?.uid||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await ur(this,{idToken:e}),s=await Be._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(s)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){if(Le(this.app)){const i=this.app.settings.authIdToken;return i?new Promise(a=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(i).then(a,a))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let s=t,r=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const i=this.redirectUser?._redirectEventId,a=s?._redirectEventId,c=await this.tryRedirectSignIn(e);(!i||i===a)&&c?.user&&(s=c.user,r=!0)}if(!s)return this.directlySetCurrentUser(null);if(!s._redirectEventId){if(r)try{await this.beforeStateQueue.runMiddleware(s)}catch(i){s=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(i))}return s?this.reloadAndSetCurrentUserOrClear(s):this.directlySetCurrentUser(null)}return U(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===s._redirectEventId?this.directlySetCurrentUser(s):this.reloadAndSetCurrentUserOrClear(s)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await hr(e)}catch(t){if(t?.code!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Qm()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(Le(this.app))return Promise.reject(Ct(this));const t=e?ie(e):null;return t&&U(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&U(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return Le(this.app)?Promise.reject(Ct(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return Le(this.app)?Promise.reject(Ct(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(st(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await hp(this),t=new fp(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new fs("auth","Firebase",e())}onAuthStateChanged(e,t,s){return this.registerStateListener(this.authStateSubscription,e,t,s)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,s){return this.registerStateListener(this.idTokenSubscription,e,t,s)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const s=this.onAuthStateChanged(()=>{s(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),s={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(s.tenantId=this.tenantId),await ap(this,s)}}toJSON(){return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:this._currentUser?.toJSON()}}async _setRedirectUser(e,t){const s=await this.getOrInitRedirectPersistenceManager(t);return e===null?s.removeCurrentUser():s.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&st(e)||this._popupRedirectResolver;U(t,this,"argument-error"),this.redirectPersistenceManager=await gn.create(this,[st(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){return this._isInitialized&&await this.queue(async()=>{}),this._currentUser?._redirectEventId===e?this._currentUser:this.redirectUser?._redirectEventId===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=this.currentUser?.uid??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,s,r){if(this._deleted)return()=>{};const i=typeof t=="function"?t:t.next.bind(t);let a=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(U(c,this,"internal-error"),c.then(()=>{a||i(this.currentUser)}),typeof t=="function"){const u=e.addObserver(t,s,r);return()=>{a=!0,u()}}else{const u=e.addObserver(t);return()=>{a=!0,u()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return U(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=Vu(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await this.heartbeatServiceProvider.getImmediate({optional:!0})?.getHeartbeatsHeader();t&&(e["X-Firebase-Client"]=t);const s=await this._getAppCheckToken();return s&&(e["X-Firebase-AppCheck"]=s),e}async _getAppCheckToken(){if(Le(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await this.appCheckServiceProvider.getImmediate({optional:!0})?.getToken();return e?.error&&Gm(`Error while retrieving App Check token: ${e.error}`),e?.token}}function xr(n){return ie(n)}class Nc{constructor(e){this.auth=e,this.observer=null,this.addObserver=Nf(t=>this.observer=t)}get next(){return U(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Po={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function pp(n){Po=n}function gp(n){return Po.loadJS(n)}function _p(){return Po.gapiScript}function yp(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ep(n,e){const t=ps(n,"auth");if(t.isInitialized()){const r=t.getImmediate(),i=t.getOptions();if(Yt(i,e??{}))return r;at(r,"already-initialized")}return t.initialize({options:e})}function Ip(n,e){const t=e?.persistence||[],s=(Array.isArray(t)?t:[t]).map(st);e?.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(s,e?.popupRedirectResolver)}function vp(n,e,t){const s=xr(n);U(/^https?:\/\//.test(e),s,"invalid-emulator-scheme");const r=!1,i=Nu(e),{host:a,port:c}=Tp(e),u=c===null?"":`:${c}`,d={url:`${i}//${a}${u}/`},f=Object.freeze({host:a,port:c,protocol:i.replace(":",""),options:Object.freeze({disableWarnings:r})});if(!s._canInitEmulator){U(s.config.emulator&&s.emulatorConfig,s,"emulator-config-failed"),U(Yt(d,s.config.emulator)&&Yt(f,s.emulatorConfig),s,"emulator-config-failed");return}s.config.emulator=d,s.emulatorConfig=f,s.settings.appVerificationDisabledForTesting=!0,dt(a)?(Dr(`${i}//${a}${u}`),Lr("Auth",!0)):wp()}function Nu(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function Tp(n){const e=Nu(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const s=t[2].split("@").pop()||"",r=/^(\[[^\]]+\])(:|$)/.exec(s);if(r){const i=r[1];return{host:i,port:Dc(s.substr(i.length+1))}}else{const[i,a]=s.split(":");return{host:i,port:Dc(a)}}}function Dc(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function wp(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Du{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return nt("not implemented")}_getIdTokenResponse(e){return nt("not implemented")}_linkToIdToken(e,t){return nt("not implemented")}_getReauthenticationResolver(e){return nt("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function _n(n,e){return Eu(n,"POST","/v1/accounts:signInWithIdp",Or(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ap="http://localhost";class Zt extends Du{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Zt(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):at("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:s,signInMethod:r,...i}=t;if(!s||!r)return null;const a=new Zt(s,r);return a.idToken=i.idToken||void 0,a.accessToken=i.accessToken||void 0,a.secret=i.secret,a.nonce=i.nonce,a.pendingToken=i.pendingToken||null,a}_getIdTokenResponse(e){const t=this.buildRequest();return _n(e,t)}_linkToIdToken(e,t){const s=this.buildRequest();return s.idToken=t,_n(e,s)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,_n(e,t)}buildRequest(){const e={requestUri:Ap,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ms(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lu{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _s extends Lu{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class It extends _s{constructor(){super("facebook.com")}static credential(e){return Zt._fromParams({providerId:It.PROVIDER_ID,signInMethod:It.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return It.credentialFromTaggedObject(e)}static credentialFromError(e){return It.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return It.credential(e.oauthAccessToken)}catch{return null}}}It.FACEBOOK_SIGN_IN_METHOD="facebook.com";It.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class vt extends _s{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Zt._fromParams({providerId:vt.PROVIDER_ID,signInMethod:vt.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return vt.credentialFromTaggedObject(e)}static credentialFromError(e){return vt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:s}=e;if(!t&&!s)return null;try{return vt.credential(t,s)}catch{return null}}}vt.GOOGLE_SIGN_IN_METHOD="google.com";vt.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tt extends _s{constructor(){super("github.com")}static credential(e){return Zt._fromParams({providerId:Tt.PROVIDER_ID,signInMethod:Tt.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return Tt.credentialFromTaggedObject(e)}static credentialFromError(e){return Tt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return Tt.credential(e.oauthAccessToken)}catch{return null}}}Tt.GITHUB_SIGN_IN_METHOD="github.com";Tt.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wt extends _s{constructor(){super("twitter.com")}static credential(e,t){return Zt._fromParams({providerId:wt.PROVIDER_ID,signInMethod:wt.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return wt.credentialFromTaggedObject(e)}static credentialFromError(e){return wt.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:s}=e;if(!t||!s)return null;try{return wt.credential(t,s)}catch{return null}}}wt.TWITTER_SIGN_IN_METHOD="twitter.com";wt.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bp(n,e){return Eu(n,"POST","/v1/accounts:signUp",Or(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,s,r=!1){const i=await Be._fromIdTokenResponse(e,s,r),a=Lc(s);return new Nt({user:i,providerId:a,_tokenResponse:s,operationType:t})}static async _forOperation(e,t,s){await e._updateTokensIfNecessary(s,!0);const r=Lc(s);return new Nt({user:e,providerId:r,_tokenResponse:s,operationType:t})}}function Lc(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Sp(n){if(Le(n.app))return Promise.reject(Ct(n));const e=xr(n);if(await e._initializationPromise,e.currentUser?.isAnonymous)return new Nt({user:e.currentUser,providerId:null,operationType:"signIn"});const t=await bp(e,{returnSecureToken:!0}),s=await Nt._fromIdTokenResponse(e,"signIn",t,!0);return await e._updateCurrentUser(s.user),s}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr extends qe{constructor(e,t,s,r){super(t.code,t.message),this.operationType=s,this.user=r,Object.setPrototypeOf(this,dr.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:s}}static _fromErrorAndOperation(e,t,s,r){return new dr(e,t,s,r)}}function Mu(n,e,t,s){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(i=>{throw i.code==="auth/multi-factor-auth-required"?dr._fromErrorAndOperation(n,i,e,s):i})}async function Rp(n,e,t=!1){const s=await is(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return Nt._forOperation(n,"link",s)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Cp(n,e,t=!1){const{auth:s}=n;if(Le(s.app))return Promise.reject(Ct(s));const r="reauthenticate";try{const i=await is(n,Mu(s,r,e,n),t);U(i.idToken,s,"internal-error");const a=Ro(i.idToken);U(a,s,"internal-error");const{sub:c}=a;return U(n.uid===c,s,"user-mismatch"),Nt._forOperation(n,r,i)}catch(i){throw i?.code==="auth/user-not-found"&&at(s,"user-mismatch"),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Pp(n,e,t=!1){if(Le(n.app))return Promise.reject(Ct(n));const s="signIn",r=await Mu(n,s,e),i=await Nt._fromIdTokenResponse(n,s,r);return t||await n._updateCurrentUser(i.user),i}function kp(n,e,t,s){return ie(n).onIdTokenChanged(e,t,s)}function Vp(n,e,t){return ie(n).beforeAuthStateChanged(e,t)}const fr="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ou{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(fr,"1"),this.storage.removeItem(fr),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Np=1e3,Dp=10;class xu extends Ou{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=ku(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const s=this.storage.getItem(t),r=this.localCache[t];s!==r&&e(t,r,s)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((a,c,u)=>{this.notifyListeners(a,u)});return}const s=e.key;t?this.detachListener():this.stopPolling();const r=()=>{const a=this.storage.getItem(s);!t&&this.localCache[s]===a||this.notifyListeners(s,a)},i=this.storage.getItem(s);lp()&&i!==e.newValue&&e.newValue!==e.oldValue?setTimeout(r,Dp):r()}notifyListeners(e,t){this.localCache[e]=t;const s=this.listeners[e];if(s)for(const r of Array.from(s))r(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,s)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:s}),!0)})},Np)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}xu.type="LOCAL";const Lp=xu;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uu extends Ou{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Uu.type="SESSION";const Fu=Uu;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mp(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ur{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(r=>r.isListeningto(e));if(t)return t;const s=new Ur(e);return this.receivers.push(s),s}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:s,eventType:r,data:i}=t.data,a=this.handlersMap[r];if(!a?.size)return;t.ports[0].postMessage({status:"ack",eventId:s,eventType:r});const c=Array.from(a).map(async d=>d(t.origin,i)),u=await Mp(c);t.ports[0].postMessage({status:"done",eventId:s,eventType:r,response:u})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Ur.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ko(n="",e=10){let t="";for(let s=0;s<e;s++)t+=Math.floor(Math.random()*10);return n+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Op{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,s=50){const r=typeof MessageChannel<"u"?new MessageChannel:null;if(!r)throw new Error("connection_unavailable");let i,a;return new Promise((c,u)=>{const d=ko("",20);r.port1.start();const f=setTimeout(()=>{u(new Error("unsupported_event"))},s);a={messageChannel:r,onMessage(p){const y=p;if(y.data.eventId===d)switch(y.data.status){case"ack":clearTimeout(f),i=setTimeout(()=>{u(new Error("timeout"))},3e3);break;case"done":clearTimeout(i),c(y.data.response);break;default:clearTimeout(f),clearTimeout(i),u(new Error("invalid_response"));break}}},this.handlers.add(a),r.port1.addEventListener("message",a.onMessage),this.target.postMessage({eventType:e,eventId:d,data:t},[r.port2])}).finally(()=>{a&&this.removeMessageHandler(a)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ke(){return window}function xp(n){Ke().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bu(){return typeof Ke().WorkerGlobalScope<"u"&&typeof Ke().importScripts=="function"}async function Up(){if(!navigator?.serviceWorker)return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Fp(){return navigator?.serviceWorker?.controller||null}function Bp(){return Bu()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ju="firebaseLocalStorageDb",jp=1,mr="firebaseLocalStorage",$u="fbase_key";class ys{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Fr(n,e){return n.transaction([mr],e?"readwrite":"readonly").objectStore(mr)}function $p(){const n=indexedDB.deleteDatabase(ju);return new ys(n).toPromise()}function to(){const n=indexedDB.open(ju,jp);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const s=n.result;try{s.createObjectStore(mr,{keyPath:$u})}catch(r){t(r)}}),n.addEventListener("success",async()=>{const s=n.result;s.objectStoreNames.contains(mr)?e(s):(s.close(),await $p(),e(await to()))})})}async function Mc(n,e,t){const s=Fr(n,!0).put({[$u]:e,value:t});return new ys(s).toPromise()}async function qp(n,e){const t=Fr(n,!1).get(e),s=await new ys(t).toPromise();return s===void 0?null:s.value}function Oc(n,e){const t=Fr(n,!0).delete(e);return new ys(t).toPromise()}const Hp=800,zp=3;class qu{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await to(),this.db)}async _withRetries(e){let t=0;for(;;)try{const s=await this._openDb();return await e(s)}catch(s){if(t++>zp)throw s;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Bu()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Ur._getInstance(Bp()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){if(this.activeServiceWorker=await Up(),!this.activeServiceWorker)return;this.sender=new Op(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&e[0]?.fulfilled&&e[0]?.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Fp()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await to();return await Mc(e,fr,"1"),await Oc(e,fr),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(s=>Mc(s,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(s=>qp(s,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Oc(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(r=>{const i=Fr(r,!1).getAll();return new ys(i).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],s=new Set;if(e.length!==0)for(const{fbase_key:r,value:i}of e)s.add(r),JSON.stringify(this.localCache[r])!==JSON.stringify(i)&&(this.notifyListeners(r,i),t.push(r));for(const r of Object.keys(this.localCache))this.localCache[r]&&!s.has(r)&&(this.notifyListeners(r,null),t.push(r));return t}notifyListeners(e,t){this.localCache[e]=t;const s=this.listeners[e];if(s)for(const r of Array.from(s))r(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Hp)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}qu.type="LOCAL";const Gp=qu;new gs(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wp(n,e){return e?st(e):(U(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vo extends Du{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return _n(e,this._buildIdpRequest())}_linkToIdToken(e,t){return _n(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return _n(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function Kp(n){return Pp(n.auth,new Vo(n),n.bypassAuthState)}function Qp(n){const{auth:e,user:t}=n;return U(t,e,"internal-error"),Cp(t,new Vo(n),n.bypassAuthState)}async function Jp(n){const{auth:e,user:t}=n;return U(t,e,"internal-error"),Rp(t,new Vo(n),n.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Hu{constructor(e,t,s,r,i=!1){this.auth=e,this.resolver=s,this.user=r,this.bypassAuthState=i,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(s){this.reject(s)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:s,postBody:r,tenantId:i,error:a,type:c}=e;if(a){this.reject(a);return}const u={auth:this.auth,requestUri:t,sessionId:s,tenantId:i||void 0,postBody:r||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(u))}catch(d){this.reject(d)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Kp;case"linkViaPopup":case"linkViaRedirect":return Jp;case"reauthViaPopup":case"reauthViaRedirect":return Qp;default:at(this.auth,"internal-error")}}resolve(e){ct(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){ct(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xp=new gs(2e3,1e4);class mn extends Hu{constructor(e,t,s,r,i){super(e,t,r,i),this.provider=s,this.authWindow=null,this.pollId=null,mn.currentPopupAction&&mn.currentPopupAction.cancel(),mn.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return U(e,this.auth,"internal-error"),e}async onExecution(){ct(this.filter.length===1,"Popup operations only handle one event");const e=ko();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(We(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){return this.authWindow?.associatedEvent||null}cancel(){this.reject(We(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,mn.currentPopupAction=null}pollUserCancellation(){const e=()=>{if(this.authWindow?.window?.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(We(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Xp.get())};e()}}mn.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yp="pendingRedirect",Zs=new Map;class Zp extends Hu{constructor(e,t,s=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,s),this.eventId=null}async execute(){let e=Zs.get(this.auth._key());if(!e){try{const s=await eg(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(s)}catch(t){e=()=>Promise.reject(t)}Zs.set(this.auth._key(),e)}return this.bypassAuthState||Zs.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function eg(n,e){const t=sg(e),s=ng(n);if(!await s._isAvailable())return!1;const r=await s._get(t)==="true";return await s._remove(t),r}function tg(n,e){Zs.set(n._key(),e)}function ng(n){return st(n._redirectPersistence)}function sg(n){return Ys(Yp,n.config.apiKey,n.name)}async function rg(n,e,t=!1){if(Le(n.app))return Promise.reject(Ct(n));const s=xr(n),r=Wp(s,e),a=await new Zp(s,r,t).execute();return a&&!t&&(delete a.user._redirectEventId,await s._persistUserIfCurrent(a.user),await s._setRedirectUser(null,e)),a}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ig=600*1e3;class og{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(s=>{this.isEventForConsumer(e,s)&&(t=!0,this.sendToConsumer(e,s),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!ag(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){if(e.error&&!zu(e)){const s=e.error.code?.split("auth/")[1]||"internal-error";t.onError(We(this.auth,s))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const s=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&s}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=ig&&this.cachedEventUids.clear(),this.cachedEventUids.has(xc(e))}saveEventToCache(e){this.cachedEventUids.add(xc(e)),this.lastProcessedEventTime=Date.now()}}function xc(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function zu({type:n,error:e}){return n==="unknown"&&e?.code==="auth/no-auth-event"}function ag(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return zu(n);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function cg(n,e={}){return Sn(n,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lg=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,ug=/^https?/;async function hg(n){if(n.config.emulator)return;const{authorizedDomains:e}=await cg(n);for(const t of e)try{if(dg(t))return}catch{}at(n,"unauthorized-domain")}function dg(n){const e=Zi(),{protocol:t,hostname:s}=new URL(e);if(n.startsWith("chrome-extension://")){const a=new URL(n);return a.hostname===""&&s===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&a.hostname===s}if(!ug.test(t))return!1;if(lg.test(n))return s===n;const r=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+r+"|"+r+")$","i").test(s)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fg=new gs(3e4,6e4);function Uc(){const n=Ke().___jsl;if(n?.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function mg(n){return new Promise((e,t)=>{function s(){Uc(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Uc(),t(We(n,"network-request-failed"))},timeout:fg.get()})}if(Ke().gapi?.iframes?.Iframe)e(gapi.iframes.getContext());else if(Ke().gapi?.load)s();else{const r=yp("iframefcb");return Ke()[r]=()=>{gapi.load?s():t(We(n,"network-request-failed"))},gp(`${_p()}?onload=${r}`).catch(i=>t(i))}}).catch(e=>{throw er=null,e})}let er=null;function pg(n){return er=er||mg(n),er}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gg=new gs(5e3,15e3),_g="__/auth/iframe",yg="emulator/auth/iframe",Eg={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},Ig=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function vg(n){const e=n.config;U(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?So(e,yg):`https://${n.config.authDomain}/${_g}`,s={apiKey:e.apiKey,appName:n.name,v:nn},r=Ig.get(n.config.apiHost);r&&(s.eid=r);const i=n._getFrameworks();return i.length&&(s.fw=i.join(",")),`${t}?${ms(s).slice(1)}`}async function Tg(n){const e=await pg(n),t=Ke().gapi;return U(t,n,"internal-error"),e.open({where:document.body,url:vg(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Eg,dontclear:!0},s=>new Promise(async(r,i)=>{await s.restyle({setHideOnLeave:!1});const a=We(n,"network-request-failed"),c=Ke().setTimeout(()=>{i(a)},gg.get());function u(){Ke().clearTimeout(c),r(s)}s.ping(u).then(u,()=>{i(a)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wg={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Ag=500,bg=600,Sg="_blank",Rg="http://localhost";class Fc{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Cg(n,e,t,s=Ag,r=bg){const i=Math.max((window.screen.availHeight-r)/2,0).toString(),a=Math.max((window.screen.availWidth-s)/2,0).toString();let c="";const u={...wg,width:s.toString(),height:r.toString(),top:i,left:a},d=be().toLowerCase();t&&(c=bu(d)?Sg:t),wu(d)&&(e=e||Rg,u.scrollbars="yes");const f=Object.entries(u).reduce((y,[S,P])=>`${y}${S}=${P},`,"");if(cp(d)&&c!=="_self")return Pg(e||"",c),new Fc(null);const p=window.open(e||"",c,f);U(p,n,"popup-blocked");try{p.focus()}catch{}return new Fc(p)}function Pg(n,e){const t=document.createElement("a");t.href=n,t.target=e;const s=document.createEvent("MouseEvent");s.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kg="__/auth/handler",Vg="emulator/auth/handler",Ng=encodeURIComponent("fac");async function Bc(n,e,t,s,r,i){U(n.config.authDomain,n,"auth-domain-config-required"),U(n.config.apiKey,n,"invalid-api-key");const a={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:s,v:nn,eventId:r};if(e instanceof Lu){e.setDefaultLanguage(n.languageCode),a.providerId=e.providerId||"",Vf(e.getCustomParameters())||(a.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,p]of Object.entries({}))a[f]=p}if(e instanceof _s){const f=e.getScopes().filter(p=>p!=="");f.length>0&&(a.scopes=f.join(","))}n.tenantId&&(a.tid=n.tenantId);const c=a;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const u=await n._getAppCheckToken(),d=u?`#${Ng}=${encodeURIComponent(u)}`:"";return`${Dg(n)}?${ms(c).slice(1)}${d}`}function Dg({config:n}){return n.emulator?So(n,Vg):`https://${n.authDomain}/${kg}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bi="webStorageSupport";class Lg{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Fu,this._completeRedirectFn=rg,this._overrideRedirectResult=tg}async _openPopup(e,t,s,r){ct(this.eventManagers[e._key()]?.manager,"_initialize() not called before _openPopup()");const i=await Bc(e,t,s,Zi(),r);return Cg(e,i,ko())}async _openRedirect(e,t,s,r){await this._originValidation(e);const i=await Bc(e,t,s,Zi(),r);return xp(i),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:r,promise:i}=this.eventManagers[t];return r?Promise.resolve(r):(ct(i,"If manager is not set, promise should be"),i)}const s=this.initAndGetManager(e);return this.eventManagers[t]={promise:s},s.catch(()=>{delete this.eventManagers[t]}),s}async initAndGetManager(e){const t=await Tg(e),s=new og(e);return t.register("authEvent",r=>(U(r?.authEvent,e,"invalid-auth-event"),{status:s.onEvent(r.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:s},this.iframes[e._key()]=t,s}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Bi,{type:Bi},r=>{const i=r?.[0]?.[Bi];i!==void 0&&t(!!i),at(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=hg(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return ku()||Au()||Co()}}const Mg=Lg;var jc="@firebase/auth",$c="1.11.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Og{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){return this.assertAuthConfigured(),this.auth.currentUser?.uid||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(s=>{e(s?.stsTokenManager.accessToken||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){U(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xg(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Ug(n){Vt(new it("auth",(e,{options:t})=>{const s=e.getProvider("app").getImmediate(),r=e.getProvider("heartbeat"),i=e.getProvider("app-check-internal"),{apiKey:a,authDomain:c}=s.options;U(a&&!a.includes(":"),"invalid-api-key",{appName:s.name});const u={apiKey:a,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Vu(n)},d=new mp(s,r,i,u);return Ip(d,t),d},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,s)=>{e.getProvider("auth-internal").initialize()})),Vt(new it("auth-internal",e=>{const t=xr(e.getProvider("auth").getImmediate());return(s=>new Og(s))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Fe(jc,$c,xg(n)),Fe(jc,$c,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fg=300,Bg=au("authIdTokenMaxAge")||Fg;let qc=null;const jg=n=>async e=>{const t=e&&await e.getIdTokenResult(),s=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(s&&s>Bg)return;const r=t?.token;qc!==r&&(qc=r,await fetch(n,{method:r?"POST":"DELETE",headers:r?{Authorization:`Bearer ${r}`}:{}}))};function $g(n=Mr()){const e=ps(n,"auth");if(e.isInitialized())return e.getImmediate();const t=Ep(n,{popupRedirectResolver:Mg,persistence:[Gp,Lp,Fu]}),s=au("authTokenSyncURL");if(s&&typeof isSecureContext=="boolean"&&isSecureContext){const i=new URL(s,location.origin);if(location.origin===i.origin){const a=jg(i.toString());Vp(t,a,()=>a(t.currentUser)),kp(t,c=>a(c))}}const r=iu("auth");return r&&vp(t,`http://${r}`),t}function qg(){return document.getElementsByTagName("head")?.[0]??document}pp({loadJS(n){return new Promise((e,t)=>{const s=document.createElement("script");s.setAttribute("src",n),s.onload=e,s.onerror=r=>{const i=We("internal-error");i.customData=r,t(i)},s.type="text/javascript",s.charset="UTF-8",qg().appendChild(s)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Ug("Browser");var Hc=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Pt,Gu;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(v,g){function E(){}E.prototype=g.prototype,v.F=g.prototype,v.prototype=new E,v.prototype.constructor=v,v.D=function(T,I,A){for(var _=Array(arguments.length-2),Ce=2;Ce<arguments.length;Ce++)_[Ce-2]=arguments[Ce];return g.prototype[I].apply(T,_)}}function t(){this.blockSize=-1}function s(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.C=Array(this.blockSize),this.o=this.h=0,this.u()}e(s,t),s.prototype.u=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function r(v,g,E){E||(E=0);const T=Array(16);if(typeof g=="string")for(var I=0;I<16;++I)T[I]=g.charCodeAt(E++)|g.charCodeAt(E++)<<8|g.charCodeAt(E++)<<16|g.charCodeAt(E++)<<24;else for(I=0;I<16;++I)T[I]=g[E++]|g[E++]<<8|g[E++]<<16|g[E++]<<24;g=v.g[0],E=v.g[1],I=v.g[2];let A=v.g[3],_;_=g+(A^E&(I^A))+T[0]+3614090360&4294967295,g=E+(_<<7&4294967295|_>>>25),_=A+(I^g&(E^I))+T[1]+3905402710&4294967295,A=g+(_<<12&4294967295|_>>>20),_=I+(E^A&(g^E))+T[2]+606105819&4294967295,I=A+(_<<17&4294967295|_>>>15),_=E+(g^I&(A^g))+T[3]+3250441966&4294967295,E=I+(_<<22&4294967295|_>>>10),_=g+(A^E&(I^A))+T[4]+4118548399&4294967295,g=E+(_<<7&4294967295|_>>>25),_=A+(I^g&(E^I))+T[5]+1200080426&4294967295,A=g+(_<<12&4294967295|_>>>20),_=I+(E^A&(g^E))+T[6]+2821735955&4294967295,I=A+(_<<17&4294967295|_>>>15),_=E+(g^I&(A^g))+T[7]+4249261313&4294967295,E=I+(_<<22&4294967295|_>>>10),_=g+(A^E&(I^A))+T[8]+1770035416&4294967295,g=E+(_<<7&4294967295|_>>>25),_=A+(I^g&(E^I))+T[9]+2336552879&4294967295,A=g+(_<<12&4294967295|_>>>20),_=I+(E^A&(g^E))+T[10]+4294925233&4294967295,I=A+(_<<17&4294967295|_>>>15),_=E+(g^I&(A^g))+T[11]+2304563134&4294967295,E=I+(_<<22&4294967295|_>>>10),_=g+(A^E&(I^A))+T[12]+1804603682&4294967295,g=E+(_<<7&4294967295|_>>>25),_=A+(I^g&(E^I))+T[13]+4254626195&4294967295,A=g+(_<<12&4294967295|_>>>20),_=I+(E^A&(g^E))+T[14]+2792965006&4294967295,I=A+(_<<17&4294967295|_>>>15),_=E+(g^I&(A^g))+T[15]+1236535329&4294967295,E=I+(_<<22&4294967295|_>>>10),_=g+(I^A&(E^I))+T[1]+4129170786&4294967295,g=E+(_<<5&4294967295|_>>>27),_=A+(E^I&(g^E))+T[6]+3225465664&4294967295,A=g+(_<<9&4294967295|_>>>23),_=I+(g^E&(A^g))+T[11]+643717713&4294967295,I=A+(_<<14&4294967295|_>>>18),_=E+(A^g&(I^A))+T[0]+3921069994&4294967295,E=I+(_<<20&4294967295|_>>>12),_=g+(I^A&(E^I))+T[5]+3593408605&4294967295,g=E+(_<<5&4294967295|_>>>27),_=A+(E^I&(g^E))+T[10]+38016083&4294967295,A=g+(_<<9&4294967295|_>>>23),_=I+(g^E&(A^g))+T[15]+3634488961&4294967295,I=A+(_<<14&4294967295|_>>>18),_=E+(A^g&(I^A))+T[4]+3889429448&4294967295,E=I+(_<<20&4294967295|_>>>12),_=g+(I^A&(E^I))+T[9]+568446438&4294967295,g=E+(_<<5&4294967295|_>>>27),_=A+(E^I&(g^E))+T[14]+3275163606&4294967295,A=g+(_<<9&4294967295|_>>>23),_=I+(g^E&(A^g))+T[3]+4107603335&4294967295,I=A+(_<<14&4294967295|_>>>18),_=E+(A^g&(I^A))+T[8]+1163531501&4294967295,E=I+(_<<20&4294967295|_>>>12),_=g+(I^A&(E^I))+T[13]+2850285829&4294967295,g=E+(_<<5&4294967295|_>>>27),_=A+(E^I&(g^E))+T[2]+4243563512&4294967295,A=g+(_<<9&4294967295|_>>>23),_=I+(g^E&(A^g))+T[7]+1735328473&4294967295,I=A+(_<<14&4294967295|_>>>18),_=E+(A^g&(I^A))+T[12]+2368359562&4294967295,E=I+(_<<20&4294967295|_>>>12),_=g+(E^I^A)+T[5]+4294588738&4294967295,g=E+(_<<4&4294967295|_>>>28),_=A+(g^E^I)+T[8]+2272392833&4294967295,A=g+(_<<11&4294967295|_>>>21),_=I+(A^g^E)+T[11]+1839030562&4294967295,I=A+(_<<16&4294967295|_>>>16),_=E+(I^A^g)+T[14]+4259657740&4294967295,E=I+(_<<23&4294967295|_>>>9),_=g+(E^I^A)+T[1]+2763975236&4294967295,g=E+(_<<4&4294967295|_>>>28),_=A+(g^E^I)+T[4]+1272893353&4294967295,A=g+(_<<11&4294967295|_>>>21),_=I+(A^g^E)+T[7]+4139469664&4294967295,I=A+(_<<16&4294967295|_>>>16),_=E+(I^A^g)+T[10]+3200236656&4294967295,E=I+(_<<23&4294967295|_>>>9),_=g+(E^I^A)+T[13]+681279174&4294967295,g=E+(_<<4&4294967295|_>>>28),_=A+(g^E^I)+T[0]+3936430074&4294967295,A=g+(_<<11&4294967295|_>>>21),_=I+(A^g^E)+T[3]+3572445317&4294967295,I=A+(_<<16&4294967295|_>>>16),_=E+(I^A^g)+T[6]+76029189&4294967295,E=I+(_<<23&4294967295|_>>>9),_=g+(E^I^A)+T[9]+3654602809&4294967295,g=E+(_<<4&4294967295|_>>>28),_=A+(g^E^I)+T[12]+3873151461&4294967295,A=g+(_<<11&4294967295|_>>>21),_=I+(A^g^E)+T[15]+530742520&4294967295,I=A+(_<<16&4294967295|_>>>16),_=E+(I^A^g)+T[2]+3299628645&4294967295,E=I+(_<<23&4294967295|_>>>9),_=g+(I^(E|~A))+T[0]+4096336452&4294967295,g=E+(_<<6&4294967295|_>>>26),_=A+(E^(g|~I))+T[7]+1126891415&4294967295,A=g+(_<<10&4294967295|_>>>22),_=I+(g^(A|~E))+T[14]+2878612391&4294967295,I=A+(_<<15&4294967295|_>>>17),_=E+(A^(I|~g))+T[5]+4237533241&4294967295,E=I+(_<<21&4294967295|_>>>11),_=g+(I^(E|~A))+T[12]+1700485571&4294967295,g=E+(_<<6&4294967295|_>>>26),_=A+(E^(g|~I))+T[3]+2399980690&4294967295,A=g+(_<<10&4294967295|_>>>22),_=I+(g^(A|~E))+T[10]+4293915773&4294967295,I=A+(_<<15&4294967295|_>>>17),_=E+(A^(I|~g))+T[1]+2240044497&4294967295,E=I+(_<<21&4294967295|_>>>11),_=g+(I^(E|~A))+T[8]+1873313359&4294967295,g=E+(_<<6&4294967295|_>>>26),_=A+(E^(g|~I))+T[15]+4264355552&4294967295,A=g+(_<<10&4294967295|_>>>22),_=I+(g^(A|~E))+T[6]+2734768916&4294967295,I=A+(_<<15&4294967295|_>>>17),_=E+(A^(I|~g))+T[13]+1309151649&4294967295,E=I+(_<<21&4294967295|_>>>11),_=g+(I^(E|~A))+T[4]+4149444226&4294967295,g=E+(_<<6&4294967295|_>>>26),_=A+(E^(g|~I))+T[11]+3174756917&4294967295,A=g+(_<<10&4294967295|_>>>22),_=I+(g^(A|~E))+T[2]+718787259&4294967295,I=A+(_<<15&4294967295|_>>>17),_=E+(A^(I|~g))+T[9]+3951481745&4294967295,v.g[0]=v.g[0]+g&4294967295,v.g[1]=v.g[1]+(I+(_<<21&4294967295|_>>>11))&4294967295,v.g[2]=v.g[2]+I&4294967295,v.g[3]=v.g[3]+A&4294967295}s.prototype.v=function(v,g){g===void 0&&(g=v.length);const E=g-this.blockSize,T=this.C;let I=this.h,A=0;for(;A<g;){if(I==0)for(;A<=E;)r(this,v,A),A+=this.blockSize;if(typeof v=="string"){for(;A<g;)if(T[I++]=v.charCodeAt(A++),I==this.blockSize){r(this,T),I=0;break}}else for(;A<g;)if(T[I++]=v[A++],I==this.blockSize){r(this,T),I=0;break}}this.h=I,this.o+=g},s.prototype.A=function(){var v=Array((this.h<56?this.blockSize:this.blockSize*2)-this.h);v[0]=128;for(var g=1;g<v.length-8;++g)v[g]=0;g=this.o*8;for(var E=v.length-8;E<v.length;++E)v[E]=g&255,g/=256;for(this.v(v),v=Array(16),g=0,E=0;E<4;++E)for(let T=0;T<32;T+=8)v[g++]=this.g[E]>>>T&255;return v};function i(v,g){var E=c;return Object.prototype.hasOwnProperty.call(E,v)?E[v]:E[v]=g(v)}function a(v,g){this.h=g;const E=[];let T=!0;for(let I=v.length-1;I>=0;I--){const A=v[I]|0;T&&A==g||(E[I]=A,T=!1)}this.g=E}var c={};function u(v){return-128<=v&&v<128?i(v,function(g){return new a([g|0],g<0?-1:0)}):new a([v|0],v<0?-1:0)}function d(v){if(isNaN(v)||!isFinite(v))return p;if(v<0)return k(d(-v));const g=[];let E=1;for(let T=0;v>=E;T++)g[T]=v/E|0,E*=4294967296;return new a(g,0)}function f(v,g){if(v.length==0)throw Error("number format error: empty string");if(g=g||10,g<2||36<g)throw Error("radix out of range: "+g);if(v.charAt(0)=="-")return k(f(v.substring(1),g));if(v.indexOf("-")>=0)throw Error('number format error: interior "-" character');const E=d(Math.pow(g,8));let T=p;for(let A=0;A<v.length;A+=8){var I=Math.min(8,v.length-A);const _=parseInt(v.substring(A,A+I),g);I<8?(I=d(Math.pow(g,I)),T=T.j(I).add(d(_))):(T=T.j(E),T=T.add(d(_)))}return T}var p=u(0),y=u(1),S=u(16777216);n=a.prototype,n.m=function(){if(D(this))return-k(this).m();let v=0,g=1;for(let E=0;E<this.g.length;E++){const T=this.i(E);v+=(T>=0?T:4294967296+T)*g,g*=4294967296}return v},n.toString=function(v){if(v=v||10,v<2||36<v)throw Error("radix out of range: "+v);if(P(this))return"0";if(D(this))return"-"+k(this).toString(v);const g=d(Math.pow(v,6));var E=this;let T="";for(;;){const I=X(E,g).g;E=j(E,I.j(g));let A=((E.g.length>0?E.g[0]:E.h)>>>0).toString(v);if(E=I,P(E))return A+T;for(;A.length<6;)A="0"+A;T=A+T}},n.i=function(v){return v<0?0:v<this.g.length?this.g[v]:this.h};function P(v){if(v.h!=0)return!1;for(let g=0;g<v.g.length;g++)if(v.g[g]!=0)return!1;return!0}function D(v){return v.h==-1}n.l=function(v){return v=j(this,v),D(v)?-1:P(v)?0:1};function k(v){const g=v.g.length,E=[];for(let T=0;T<g;T++)E[T]=~v.g[T];return new a(E,~v.h).add(y)}n.abs=function(){return D(this)?k(this):this},n.add=function(v){const g=Math.max(this.g.length,v.g.length),E=[];let T=0;for(let I=0;I<=g;I++){let A=T+(this.i(I)&65535)+(v.i(I)&65535),_=(A>>>16)+(this.i(I)>>>16)+(v.i(I)>>>16);T=_>>>16,A&=65535,_&=65535,E[I]=_<<16|A}return new a(E,E[E.length-1]&-2147483648?-1:0)};function j(v,g){return v.add(k(g))}n.j=function(v){if(P(this)||P(v))return p;if(D(this))return D(v)?k(this).j(k(v)):k(k(this).j(v));if(D(v))return k(this.j(k(v)));if(this.l(S)<0&&v.l(S)<0)return d(this.m()*v.m());const g=this.g.length+v.g.length,E=[];for(var T=0;T<2*g;T++)E[T]=0;for(T=0;T<this.g.length;T++)for(let I=0;I<v.g.length;I++){const A=this.i(T)>>>16,_=this.i(T)&65535,Ce=v.i(I)>>>16,jt=v.i(I)&65535;E[2*T+2*I]+=_*jt,K(E,2*T+2*I),E[2*T+2*I+1]+=A*jt,K(E,2*T+2*I+1),E[2*T+2*I+1]+=_*Ce,K(E,2*T+2*I+1),E[2*T+2*I+2]+=A*Ce,K(E,2*T+2*I+2)}for(v=0;v<g;v++)E[v]=E[2*v+1]<<16|E[2*v];for(v=g;v<2*g;v++)E[v]=0;return new a(E,0)};function K(v,g){for(;(v[g]&65535)!=v[g];)v[g+1]+=v[g]>>>16,v[g]&=65535,g++}function H(v,g){this.g=v,this.h=g}function X(v,g){if(P(g))throw Error("division by zero");if(P(v))return new H(p,p);if(D(v))return g=X(k(v),g),new H(k(g.g),k(g.h));if(D(g))return g=X(v,k(g)),new H(k(g.g),g.h);if(v.g.length>30){if(D(v)||D(g))throw Error("slowDivide_ only works with positive integers.");for(var E=y,T=g;T.l(v)<=0;)E=de(E),T=de(T);var I=se(E,1),A=se(T,1);for(T=se(T,2),E=se(E,2);!P(T);){var _=A.add(T);_.l(v)<=0&&(I=I.add(E),A=_),T=se(T,1),E=se(E,1)}return g=j(v,I.j(g)),new H(I,g)}for(I=p;v.l(g)>=0;){for(E=Math.max(1,Math.floor(v.m()/g.m())),T=Math.ceil(Math.log(E)/Math.LN2),T=T<=48?1:Math.pow(2,T-48),A=d(E),_=A.j(g);D(_)||_.l(v)>0;)E-=T,A=d(E),_=A.j(g);P(A)&&(A=y),I=I.add(A),v=j(v,_)}return new H(I,v)}n.B=function(v){return X(this,v).h},n.and=function(v){const g=Math.max(this.g.length,v.g.length),E=[];for(let T=0;T<g;T++)E[T]=this.i(T)&v.i(T);return new a(E,this.h&v.h)},n.or=function(v){const g=Math.max(this.g.length,v.g.length),E=[];for(let T=0;T<g;T++)E[T]=this.i(T)|v.i(T);return new a(E,this.h|v.h)},n.xor=function(v){const g=Math.max(this.g.length,v.g.length),E=[];for(let T=0;T<g;T++)E[T]=this.i(T)^v.i(T);return new a(E,this.h^v.h)};function de(v){const g=v.g.length+1,E=[];for(let T=0;T<g;T++)E[T]=v.i(T)<<1|v.i(T-1)>>>31;return new a(E,v.h)}function se(v,g){const E=g>>5;g%=32;const T=v.g.length-E,I=[];for(let A=0;A<T;A++)I[A]=g>0?v.i(A+E)>>>g|v.i(A+E+1)<<32-g:v.i(A+E);return new a(I,v.h)}s.prototype.digest=s.prototype.A,s.prototype.reset=s.prototype.u,s.prototype.update=s.prototype.v,Gu=s,a.prototype.add=a.prototype.add,a.prototype.multiply=a.prototype.j,a.prototype.modulo=a.prototype.B,a.prototype.compare=a.prototype.l,a.prototype.toNumber=a.prototype.m,a.prototype.toString=a.prototype.toString,a.prototype.getBits=a.prototype.i,a.fromNumber=d,a.fromString=f,Pt=a}).apply(typeof Hc<"u"?Hc:typeof self<"u"?self:typeof window<"u"?window:{});var zs=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Wu,Kn,Ku,tr,no,Qu,Ju,Xu;(function(){var n,e=Object.defineProperty;function t(o){o=[typeof globalThis=="object"&&globalThis,o,typeof window=="object"&&window,typeof self=="object"&&self,typeof zs=="object"&&zs];for(var l=0;l<o.length;++l){var h=o[l];if(h&&h.Math==Math)return h}throw Error("Cannot find global object")}var s=t(this);function r(o,l){if(l)e:{var h=s;o=o.split(".");for(var m=0;m<o.length-1;m++){var w=o[m];if(!(w in h))break e;h=h[w]}o=o[o.length-1],m=h[o],l=l(m),l!=m&&l!=null&&e(h,o,{configurable:!0,writable:!0,value:l})}}r("Symbol.dispose",function(o){return o||Symbol("Symbol.dispose")}),r("Array.prototype.values",function(o){return o||function(){return this[Symbol.iterator]()}}),r("Object.entries",function(o){return o||function(l){var h=[],m;for(m in l)Object.prototype.hasOwnProperty.call(l,m)&&h.push([m,l[m]]);return h}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var i=i||{},a=this||self;function c(o){var l=typeof o;return l=="object"&&o!=null||l=="function"}function u(o,l,h){return o.call.apply(o.bind,arguments)}function d(o,l,h){return d=u,d.apply(null,arguments)}function f(o,l){var h=Array.prototype.slice.call(arguments,1);return function(){var m=h.slice();return m.push.apply(m,arguments),o.apply(this,m)}}function p(o,l){function h(){}h.prototype=l.prototype,o.Z=l.prototype,o.prototype=new h,o.prototype.constructor=o,o.Ob=function(m,w,b){for(var V=Array(arguments.length-2),$=2;$<arguments.length;$++)V[$-2]=arguments[$];return l.prototype[w].apply(m,V)}}var y=typeof AsyncContext<"u"&&typeof AsyncContext.Snapshot=="function"?o=>o&&AsyncContext.Snapshot.wrap(o):o=>o;function S(o){const l=o.length;if(l>0){const h=Array(l);for(let m=0;m<l;m++)h[m]=o[m];return h}return[]}function P(o,l){for(let m=1;m<arguments.length;m++){const w=arguments[m];var h=typeof w;if(h=h!="object"?h:w?Array.isArray(w)?"array":h:"null",h=="array"||h=="object"&&typeof w.length=="number"){h=o.length||0;const b=w.length||0;o.length=h+b;for(let V=0;V<b;V++)o[h+V]=w[V]}else o.push(w)}}class D{constructor(l,h){this.i=l,this.j=h,this.h=0,this.g=null}get(){let l;return this.h>0?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function k(o){a.setTimeout(()=>{throw o},0)}function j(){var o=v;let l=null;return o.g&&(l=o.g,o.g=o.g.next,o.g||(o.h=null),l.next=null),l}class K{constructor(){this.h=this.g=null}add(l,h){const m=H.get();m.set(l,h),this.h?this.h.next=m:this.g=m,this.h=m}}var H=new D(()=>new X,o=>o.reset());class X{constructor(){this.next=this.g=this.h=null}set(l,h){this.h=l,this.g=h,this.next=null}reset(){this.next=this.g=this.h=null}}let de,se=!1,v=new K,g=()=>{const o=Promise.resolve(void 0);de=()=>{o.then(E)}};function E(){for(var o;o=j();){try{o.h.call(o.g)}catch(h){k(h)}var l=H;l.j(o),l.h<100&&(l.h++,o.next=l.g,l.g=o)}se=!1}function T(){this.u=this.u,this.C=this.C}T.prototype.u=!1,T.prototype.dispose=function(){this.u||(this.u=!0,this.N())},T.prototype[Symbol.dispose]=function(){this.dispose()},T.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function I(o,l){this.type=o,this.g=this.target=l,this.defaultPrevented=!1}I.prototype.h=function(){this.defaultPrevented=!0};var A=(function(){if(!a.addEventListener||!Object.defineProperty)return!1;var o=!1,l=Object.defineProperty({},"passive",{get:function(){o=!0}});try{const h=()=>{};a.addEventListener("test",h,l),a.removeEventListener("test",h,l)}catch{}return o})();function _(o){return/^[\s\xa0]*$/.test(o)}function Ce(o,l){I.call(this,o?o.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,o&&this.init(o,l)}p(Ce,I),Ce.prototype.init=function(o,l){const h=this.type=o.type,m=o.changedTouches&&o.changedTouches.length?o.changedTouches[0]:null;this.target=o.target||o.srcElement,this.g=l,l=o.relatedTarget,l||(h=="mouseover"?l=o.fromElement:h=="mouseout"&&(l=o.toElement)),this.relatedTarget=l,m?(this.clientX=m.clientX!==void 0?m.clientX:m.pageX,this.clientY=m.clientY!==void 0?m.clientY:m.pageY,this.screenX=m.screenX||0,this.screenY=m.screenY||0):(this.clientX=o.clientX!==void 0?o.clientX:o.pageX,this.clientY=o.clientY!==void 0?o.clientY:o.pageY,this.screenX=o.screenX||0,this.screenY=o.screenY||0),this.button=o.button,this.key=o.key||"",this.ctrlKey=o.ctrlKey,this.altKey=o.altKey,this.shiftKey=o.shiftKey,this.metaKey=o.metaKey,this.pointerId=o.pointerId||0,this.pointerType=o.pointerType,this.state=o.state,this.i=o,o.defaultPrevented&&Ce.Z.h.call(this)},Ce.prototype.h=function(){Ce.Z.h.call(this);const o=this.i;o.preventDefault?o.preventDefault():o.returnValue=!1};var jt="closure_listenable_"+(Math.random()*1e6|0),Pd=0;function kd(o,l,h,m,w){this.listener=o,this.proxy=null,this.src=l,this.type=h,this.capture=!!m,this.ha=w,this.key=++Pd,this.da=this.fa=!1}function Ps(o){o.da=!0,o.listener=null,o.proxy=null,o.src=null,o.ha=null}function ks(o,l,h){for(const m in o)l.call(h,o[m],m,o)}function Vd(o,l){for(const h in o)l.call(void 0,o[h],h,o)}function pa(o){const l={};for(const h in o)l[h]=o[h];return l}const ga="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function _a(o,l){let h,m;for(let w=1;w<arguments.length;w++){m=arguments[w];for(h in m)o[h]=m[h];for(let b=0;b<ga.length;b++)h=ga[b],Object.prototype.hasOwnProperty.call(m,h)&&(o[h]=m[h])}}function Vs(o){this.src=o,this.g={},this.h=0}Vs.prototype.add=function(o,l,h,m,w){const b=o.toString();o=this.g[b],o||(o=this.g[b]=[],this.h++);const V=hi(o,l,m,w);return V>-1?(l=o[V],h||(l.fa=!1)):(l=new kd(l,this.src,b,!!m,w),l.fa=h,o.push(l)),l};function ui(o,l){const h=l.type;if(h in o.g){var m=o.g[h],w=Array.prototype.indexOf.call(m,l,void 0),b;(b=w>=0)&&Array.prototype.splice.call(m,w,1),b&&(Ps(l),o.g[h].length==0&&(delete o.g[h],o.h--))}}function hi(o,l,h,m){for(let w=0;w<o.length;++w){const b=o[w];if(!b.da&&b.listener==l&&b.capture==!!h&&b.ha==m)return w}return-1}var di="closure_lm_"+(Math.random()*1e6|0),fi={};function ya(o,l,h,m,w){if(Array.isArray(l)){for(let b=0;b<l.length;b++)ya(o,l[b],h,m,w);return null}return h=va(h),o&&o[jt]?o.J(l,h,c(m)?!!m.capture:!1,w):Nd(o,l,h,!1,m,w)}function Nd(o,l,h,m,w,b){if(!l)throw Error("Invalid event type");const V=c(w)?!!w.capture:!!w;let $=pi(o);if($||(o[di]=$=new Vs(o)),h=$.add(l,h,m,V,b),h.proxy)return h;if(m=Dd(),h.proxy=m,m.src=o,m.listener=h,o.addEventListener)A||(w=V),w===void 0&&(w=!1),o.addEventListener(l.toString(),m,w);else if(o.attachEvent)o.attachEvent(Ia(l.toString()),m);else if(o.addListener&&o.removeListener)o.addListener(m);else throw Error("addEventListener and attachEvent are unavailable.");return h}function Dd(){function o(h){return l.call(o.src,o.listener,h)}const l=Ld;return o}function Ea(o,l,h,m,w){if(Array.isArray(l))for(var b=0;b<l.length;b++)Ea(o,l[b],h,m,w);else m=c(m)?!!m.capture:!!m,h=va(h),o&&o[jt]?(o=o.i,b=String(l).toString(),b in o.g&&(l=o.g[b],h=hi(l,h,m,w),h>-1&&(Ps(l[h]),Array.prototype.splice.call(l,h,1),l.length==0&&(delete o.g[b],o.h--)))):o&&(o=pi(o))&&(l=o.g[l.toString()],o=-1,l&&(o=hi(l,h,m,w)),(h=o>-1?l[o]:null)&&mi(h))}function mi(o){if(typeof o!="number"&&o&&!o.da){var l=o.src;if(l&&l[jt])ui(l.i,o);else{var h=o.type,m=o.proxy;l.removeEventListener?l.removeEventListener(h,m,o.capture):l.detachEvent?l.detachEvent(Ia(h),m):l.addListener&&l.removeListener&&l.removeListener(m),(h=pi(l))?(ui(h,o),h.h==0&&(h.src=null,l[di]=null)):Ps(o)}}}function Ia(o){return o in fi?fi[o]:fi[o]="on"+o}function Ld(o,l){if(o.da)o=!0;else{l=new Ce(l,this);const h=o.listener,m=o.ha||o.src;o.fa&&mi(o),o=h.call(m,l)}return o}function pi(o){return o=o[di],o instanceof Vs?o:null}var gi="__closure_events_fn_"+(Math.random()*1e9>>>0);function va(o){return typeof o=="function"?o:(o[gi]||(o[gi]=function(l){return o.handleEvent(l)}),o[gi])}function ve(){T.call(this),this.i=new Vs(this),this.M=this,this.G=null}p(ve,T),ve.prototype[jt]=!0,ve.prototype.removeEventListener=function(o,l,h,m){Ea(this,o,l,h,m)};function Se(o,l){var h,m=o.G;if(m)for(h=[];m;m=m.G)h.push(m);if(o=o.M,m=l.type||l,typeof l=="string")l=new I(l,o);else if(l instanceof I)l.target=l.target||o;else{var w=l;l=new I(m,o),_a(l,w)}w=!0;let b,V;if(h)for(V=h.length-1;V>=0;V--)b=l.g=h[V],w=Ns(b,m,!0,l)&&w;if(b=l.g=o,w=Ns(b,m,!0,l)&&w,w=Ns(b,m,!1,l)&&w,h)for(V=0;V<h.length;V++)b=l.g=h[V],w=Ns(b,m,!1,l)&&w}ve.prototype.N=function(){if(ve.Z.N.call(this),this.i){var o=this.i;for(const l in o.g){const h=o.g[l];for(let m=0;m<h.length;m++)Ps(h[m]);delete o.g[l],o.h--}}this.G=null},ve.prototype.J=function(o,l,h,m){return this.i.add(String(o),l,!1,h,m)},ve.prototype.K=function(o,l,h,m){return this.i.add(String(o),l,!0,h,m)};function Ns(o,l,h,m){if(l=o.i.g[String(l)],!l)return!0;l=l.concat();let w=!0;for(let b=0;b<l.length;++b){const V=l[b];if(V&&!V.da&&V.capture==h){const $=V.listener,fe=V.ha||V.src;V.fa&&ui(o.i,V),w=$.call(fe,m)!==!1&&w}}return w&&!m.defaultPrevented}function Md(o,l){if(typeof o!="function")if(o&&typeof o.handleEvent=="function")o=d(o.handleEvent,o);else throw Error("Invalid listener argument");return Number(l)>2147483647?-1:a.setTimeout(o,l||0)}function Ta(o){o.g=Md(()=>{o.g=null,o.i&&(o.i=!1,Ta(o))},o.l);const l=o.h;o.h=null,o.m.apply(null,l)}class Od extends T{constructor(l,h){super(),this.m=l,this.l=h,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:Ta(this)}N(){super.N(),this.g&&(a.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Nn(o){T.call(this),this.h=o,this.g={}}p(Nn,T);var wa=[];function Aa(o){ks(o.g,function(l,h){this.g.hasOwnProperty(h)&&mi(l)},o),o.g={}}Nn.prototype.N=function(){Nn.Z.N.call(this),Aa(this)},Nn.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var _i=a.JSON.stringify,xd=a.JSON.parse,Ud=class{stringify(o){return a.JSON.stringify(o,void 0)}parse(o){return a.JSON.parse(o,void 0)}};function ba(){}function Sa(){}var Dn={OPEN:"a",hb:"b",ERROR:"c",tb:"d"};function yi(){I.call(this,"d")}p(yi,I);function Ei(){I.call(this,"c")}p(Ei,I);var $t={},Ra=null;function Ds(){return Ra=Ra||new ve}$t.Ia="serverreachability";function Ca(o){I.call(this,$t.Ia,o)}p(Ca,I);function Ln(o){const l=Ds();Se(l,new Ca(l))}$t.STAT_EVENT="statevent";function Pa(o,l){I.call(this,$t.STAT_EVENT,o),this.stat=l}p(Pa,I);function Re(o){const l=Ds();Se(l,new Pa(l,o))}$t.Ja="timingevent";function ka(o,l){I.call(this,$t.Ja,o),this.size=l}p(ka,I);function Mn(o,l){if(typeof o!="function")throw Error("Fn must not be null and must be a function");return a.setTimeout(function(){o()},l)}function On(){this.g=!0}On.prototype.ua=function(){this.g=!1};function Fd(o,l,h,m,w,b){o.info(function(){if(o.g)if(b){var V="",$=b.split("&");for(let Y=0;Y<$.length;Y++){var fe=$[Y].split("=");if(fe.length>1){const pe=fe[0];fe=fe[1];const ze=pe.split("_");V=ze.length>=2&&ze[1]=="type"?V+(pe+"="+fe+"&"):V+(pe+"=redacted&")}}}else V=null;else V=b;return"XMLHTTP REQ ("+m+") [attempt "+w+"]: "+l+`
`+h+`
`+V})}function Bd(o,l,h,m,w,b,V){o.info(function(){return"XMLHTTP RESP ("+m+") [ attempt "+w+"]: "+l+`
`+h+`
`+b+" "+V})}function an(o,l,h,m){o.info(function(){return"XMLHTTP TEXT ("+l+"): "+$d(o,h)+(m?" "+m:"")})}function jd(o,l){o.info(function(){return"TIMEOUT: "+l})}On.prototype.info=function(){};function $d(o,l){if(!o.g)return l;if(!l)return null;try{const b=JSON.parse(l);if(b){for(o=0;o<b.length;o++)if(Array.isArray(b[o])){var h=b[o];if(!(h.length<2)){var m=h[1];if(Array.isArray(m)&&!(m.length<1)){var w=m[0];if(w!="noop"&&w!="stop"&&w!="close")for(let V=1;V<m.length;V++)m[V]=""}}}}return _i(b)}catch{return l}}var Ls={NO_ERROR:0,cb:1,qb:2,pb:3,kb:4,ob:5,rb:6,Ga:7,TIMEOUT:8,ub:9},Va={ib:"complete",Fb:"success",ERROR:"error",Ga:"abort",xb:"ready",yb:"readystatechange",TIMEOUT:"timeout",sb:"incrementaldata",wb:"progress",lb:"downloadprogress",Nb:"uploadprogress"},Na;function Ii(){}p(Ii,ba),Ii.prototype.g=function(){return new XMLHttpRequest},Na=new Ii;function xn(o){return encodeURIComponent(String(o))}function qd(o){var l=1;o=o.split(":");const h=[];for(;l>0&&o.length;)h.push(o.shift()),l--;return o.length&&h.push(o.join(":")),h}function ft(o,l,h,m){this.j=o,this.i=l,this.l=h,this.S=m||1,this.V=new Nn(this),this.H=45e3,this.J=null,this.o=!1,this.u=this.B=this.A=this.M=this.F=this.T=this.D=null,this.G=[],this.g=null,this.C=0,this.m=this.v=null,this.X=-1,this.K=!1,this.P=0,this.O=null,this.W=this.L=this.U=this.R=!1,this.h=new Da}function Da(){this.i=null,this.g="",this.h=!1}var La={},vi={};function Ti(o,l,h){o.M=1,o.A=Os(He(l)),o.u=h,o.R=!0,Ma(o,null)}function Ma(o,l){o.F=Date.now(),Ms(o),o.B=He(o.A);var h=o.B,m=o.S;Array.isArray(m)||(m=[String(m)]),Ka(h.i,"t",m),o.C=0,h=o.j.L,o.h=new Da,o.g=dc(o.j,h?l:null,!o.u),o.P>0&&(o.O=new Od(d(o.Y,o,o.g),o.P)),l=o.V,h=o.g,m=o.ba;var w="readystatechange";Array.isArray(w)||(w&&(wa[0]=w.toString()),w=wa);for(let b=0;b<w.length;b++){const V=ya(h,w[b],m||l.handleEvent,!1,l.h||l);if(!V)break;l.g[V.key]=V}l=o.J?pa(o.J):{},o.u?(o.v||(o.v="POST"),l["Content-Type"]="application/x-www-form-urlencoded",o.g.ea(o.B,o.v,o.u,l)):(o.v="GET",o.g.ea(o.B,o.v,null,l)),Ln(),Fd(o.i,o.v,o.B,o.l,o.S,o.u)}ft.prototype.ba=function(o){o=o.target;const l=this.O;l&&gt(o)==3?l.j():this.Y(o)},ft.prototype.Y=function(o){try{if(o==this.g)e:{const $=gt(this.g),fe=this.g.ya(),Y=this.g.ca();if(!($<3)&&($!=3||this.g&&(this.h.h||this.g.la()||tc(this.g)))){this.K||$!=4||fe==7||(fe==8||Y<=0?Ln(3):Ln(2)),wi(this);var l=this.g.ca();this.X=l;var h=Hd(this);if(this.o=l==200,Bd(this.i,this.v,this.B,this.l,this.S,$,l),this.o){if(this.U&&!this.L){t:{if(this.g){var m,w=this.g;if((m=w.g?w.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!_(m)){var b=m;break t}}b=null}if(o=b)an(this.i,this.l,o,"Initial handshake response via X-HTTP-Initial-Response"),this.L=!0,Ai(this,o);else{this.o=!1,this.m=3,Re(12),qt(this),Un(this);break e}}if(this.R){o=!0;let pe;for(;!this.K&&this.C<h.length;)if(pe=zd(this,h),pe==vi){$==4&&(this.m=4,Re(14),o=!1),an(this.i,this.l,null,"[Incomplete Response]");break}else if(pe==La){this.m=4,Re(15),an(this.i,this.l,h,"[Invalid Chunk]"),o=!1;break}else an(this.i,this.l,pe,null),Ai(this,pe);if(Oa(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),$!=4||h.length!=0||this.h.h||(this.m=1,Re(16),o=!1),this.o=this.o&&o,!o)an(this.i,this.l,h,"[Invalid Chunked Response]"),qt(this),Un(this);else if(h.length>0&&!this.W){this.W=!0;var V=this.j;V.g==this&&V.aa&&!V.P&&(V.j.info("Great, no buffering proxy detected. Bytes received: "+h.length),Ni(V),V.P=!0,Re(11))}}else an(this.i,this.l,h,null),Ai(this,h);$==4&&qt(this),this.o&&!this.K&&($==4?cc(this.j,this):(this.o=!1,Ms(this)))}else of(this.g),l==400&&h.indexOf("Unknown SID")>0?(this.m=3,Re(12)):(this.m=0,Re(13)),qt(this),Un(this)}}}catch{}finally{}};function Hd(o){if(!Oa(o))return o.g.la();const l=tc(o.g);if(l==="")return"";let h="";const m=l.length,w=gt(o.g)==4;if(!o.h.i){if(typeof TextDecoder>"u")return qt(o),Un(o),"";o.h.i=new a.TextDecoder}for(let b=0;b<m;b++)o.h.h=!0,h+=o.h.i.decode(l[b],{stream:!(w&&b==m-1)});return l.length=0,o.h.g+=h,o.C=0,o.h.g}function Oa(o){return o.g?o.v=="GET"&&o.M!=2&&o.j.Aa:!1}function zd(o,l){var h=o.C,m=l.indexOf(`
`,h);return m==-1?vi:(h=Number(l.substring(h,m)),isNaN(h)?La:(m+=1,m+h>l.length?vi:(l=l.slice(m,m+h),o.C=m+h,l)))}ft.prototype.cancel=function(){this.K=!0,qt(this)};function Ms(o){o.T=Date.now()+o.H,xa(o,o.H)}function xa(o,l){if(o.D!=null)throw Error("WatchDog timer not null");o.D=Mn(d(o.aa,o),l)}function wi(o){o.D&&(a.clearTimeout(o.D),o.D=null)}ft.prototype.aa=function(){this.D=null;const o=Date.now();o-this.T>=0?(jd(this.i,this.B),this.M!=2&&(Ln(),Re(17)),qt(this),this.m=2,Un(this)):xa(this,this.T-o)};function Un(o){o.j.I==0||o.K||cc(o.j,o)}function qt(o){wi(o);var l=o.O;l&&typeof l.dispose=="function"&&l.dispose(),o.O=null,Aa(o.V),o.g&&(l=o.g,o.g=null,l.abort(),l.dispose())}function Ai(o,l){try{var h=o.j;if(h.I!=0&&(h.g==o||bi(h.h,o))){if(!o.L&&bi(h.h,o)&&h.I==3){try{var m=h.Ba.g.parse(l)}catch{m=null}if(Array.isArray(m)&&m.length==3){var w=m;if(w[0]==0){e:if(!h.v){if(h.g)if(h.g.F+3e3<o.F)js(h),Fs(h);else break e;Vi(h),Re(18)}}else h.xa=w[1],0<h.xa-h.K&&w[2]<37500&&h.F&&h.A==0&&!h.C&&(h.C=Mn(d(h.Va,h),6e3));Ba(h.h)<=1&&h.ta&&(h.ta=void 0)}else zt(h,11)}else if((o.L||h.g==o)&&js(h),!_(l))for(w=h.Ba.g.parse(l),l=0;l<w.length;l++){let Y=w[l];const pe=Y[0];if(!(pe<=h.K))if(h.K=pe,Y=Y[1],h.I==2)if(Y[0]=="c"){h.M=Y[1],h.ba=Y[2];const ze=Y[3];ze!=null&&(h.ka=ze,h.j.info("VER="+h.ka));const Gt=Y[4];Gt!=null&&(h.za=Gt,h.j.info("SVER="+h.za));const _t=Y[5];_t!=null&&typeof _t=="number"&&_t>0&&(m=1.5*_t,h.O=m,h.j.info("backChannelRequestTimeoutMs_="+m)),m=h;const yt=o.g;if(yt){const qs=yt.g?yt.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(qs){var b=m.h;b.g||qs.indexOf("spdy")==-1&&qs.indexOf("quic")==-1&&qs.indexOf("h2")==-1||(b.j=b.l,b.g=new Set,b.h&&(Si(b,b.h),b.h=null))}if(m.G){const Di=yt.g?yt.g.getResponseHeader("X-HTTP-Session-Id"):null;Di&&(m.wa=Di,ee(m.J,m.G,Di))}}h.I=3,h.l&&h.l.ra(),h.aa&&(h.T=Date.now()-o.F,h.j.info("Handshake RTT: "+h.T+"ms")),m=h;var V=o;if(m.na=hc(m,m.L?m.ba:null,m.W),V.L){ja(m.h,V);var $=V,fe=m.O;fe&&($.H=fe),$.D&&(wi($),Ms($)),m.g=V}else oc(m);h.i.length>0&&Bs(h)}else Y[0]!="stop"&&Y[0]!="close"||zt(h,7);else h.I==3&&(Y[0]=="stop"||Y[0]=="close"?Y[0]=="stop"?zt(h,7):ki(h):Y[0]!="noop"&&h.l&&h.l.qa(Y),h.A=0)}}Ln(4)}catch{}}var Gd=class{constructor(o,l){this.g=o,this.map=l}};function Ua(o){this.l=o||10,a.PerformanceNavigationTiming?(o=a.performance.getEntriesByType("navigation"),o=o.length>0&&(o[0].nextHopProtocol=="hq"||o[0].nextHopProtocol=="h2")):o=!!(a.chrome&&a.chrome.loadTimes&&a.chrome.loadTimes()&&a.chrome.loadTimes().wasFetchedViaSpdy),this.j=o?this.l:1,this.g=null,this.j>1&&(this.g=new Set),this.h=null,this.i=[]}function Fa(o){return o.h?!0:o.g?o.g.size>=o.j:!1}function Ba(o){return o.h?1:o.g?o.g.size:0}function bi(o,l){return o.h?o.h==l:o.g?o.g.has(l):!1}function Si(o,l){o.g?o.g.add(l):o.h=l}function ja(o,l){o.h&&o.h==l?o.h=null:o.g&&o.g.has(l)&&o.g.delete(l)}Ua.prototype.cancel=function(){if(this.i=$a(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const o of this.g.values())o.cancel();this.g.clear()}};function $a(o){if(o.h!=null)return o.i.concat(o.h.G);if(o.g!=null&&o.g.size!==0){let l=o.i;for(const h of o.g.values())l=l.concat(h.G);return l}return S(o.i)}var qa=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Wd(o,l){if(o){o=o.split("&");for(let h=0;h<o.length;h++){const m=o[h].indexOf("=");let w,b=null;m>=0?(w=o[h].substring(0,m),b=o[h].substring(m+1)):w=o[h],l(w,b?decodeURIComponent(b.replace(/\+/g," ")):"")}}}function mt(o){this.g=this.o=this.j="",this.u=null,this.m=this.h="",this.l=!1;let l;o instanceof mt?(this.l=o.l,Fn(this,o.j),this.o=o.o,this.g=o.g,Bn(this,o.u),this.h=o.h,Ri(this,Qa(o.i)),this.m=o.m):o&&(l=String(o).match(qa))?(this.l=!1,Fn(this,l[1]||"",!0),this.o=jn(l[2]||""),this.g=jn(l[3]||"",!0),Bn(this,l[4]),this.h=jn(l[5]||"",!0),Ri(this,l[6]||"",!0),this.m=jn(l[7]||"")):(this.l=!1,this.i=new qn(null,this.l))}mt.prototype.toString=function(){const o=[];var l=this.j;l&&o.push($n(l,Ha,!0),":");var h=this.g;return(h||l=="file")&&(o.push("//"),(l=this.o)&&o.push($n(l,Ha,!0),"@"),o.push(xn(h).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),h=this.u,h!=null&&o.push(":",String(h))),(h=this.h)&&(this.g&&h.charAt(0)!="/"&&o.push("/"),o.push($n(h,h.charAt(0)=="/"?Jd:Qd,!0))),(h=this.i.toString())&&o.push("?",h),(h=this.m)&&o.push("#",$n(h,Yd)),o.join("")},mt.prototype.resolve=function(o){const l=He(this);let h=!!o.j;h?Fn(l,o.j):h=!!o.o,h?l.o=o.o:h=!!o.g,h?l.g=o.g:h=o.u!=null;var m=o.h;if(h)Bn(l,o.u);else if(h=!!o.h){if(m.charAt(0)!="/")if(this.g&&!this.h)m="/"+m;else{var w=l.h.lastIndexOf("/");w!=-1&&(m=l.h.slice(0,w+1)+m)}if(w=m,w==".."||w==".")m="";else if(w.indexOf("./")!=-1||w.indexOf("/.")!=-1){m=w.lastIndexOf("/",0)==0,w=w.split("/");const b=[];for(let V=0;V<w.length;){const $=w[V++];$=="."?m&&V==w.length&&b.push(""):$==".."?((b.length>1||b.length==1&&b[0]!="")&&b.pop(),m&&V==w.length&&b.push("")):(b.push($),m=!0)}m=b.join("/")}else m=w}return h?l.h=m:h=o.i.toString()!=="",h?Ri(l,Qa(o.i)):h=!!o.m,h&&(l.m=o.m),l};function He(o){return new mt(o)}function Fn(o,l,h){o.j=h?jn(l,!0):l,o.j&&(o.j=o.j.replace(/:$/,""))}function Bn(o,l){if(l){if(l=Number(l),isNaN(l)||l<0)throw Error("Bad port number "+l);o.u=l}else o.u=null}function Ri(o,l,h){l instanceof qn?(o.i=l,Zd(o.i,o.l)):(h||(l=$n(l,Xd)),o.i=new qn(l,o.l))}function ee(o,l,h){o.i.set(l,h)}function Os(o){return ee(o,"zx",Math.floor(Math.random()*2147483648).toString(36)+Math.abs(Math.floor(Math.random()*2147483648)^Date.now()).toString(36)),o}function jn(o,l){return o?l?decodeURI(o.replace(/%25/g,"%2525")):decodeURIComponent(o):""}function $n(o,l,h){return typeof o=="string"?(o=encodeURI(o).replace(l,Kd),h&&(o=o.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),o):null}function Kd(o){return o=o.charCodeAt(0),"%"+(o>>4&15).toString(16)+(o&15).toString(16)}var Ha=/[#\/\?@]/g,Qd=/[#\?:]/g,Jd=/[#\?]/g,Xd=/[#\?@]/g,Yd=/#/g;function qn(o,l){this.h=this.g=null,this.i=o||null,this.j=!!l}function Ht(o){o.g||(o.g=new Map,o.h=0,o.i&&Wd(o.i,function(l,h){o.add(decodeURIComponent(l.replace(/\+/g," ")),h)}))}n=qn.prototype,n.add=function(o,l){Ht(this),this.i=null,o=cn(this,o);let h=this.g.get(o);return h||this.g.set(o,h=[]),h.push(l),this.h+=1,this};function za(o,l){Ht(o),l=cn(o,l),o.g.has(l)&&(o.i=null,o.h-=o.g.get(l).length,o.g.delete(l))}function Ga(o,l){return Ht(o),l=cn(o,l),o.g.has(l)}n.forEach=function(o,l){Ht(this),this.g.forEach(function(h,m){h.forEach(function(w){o.call(l,w,m,this)},this)},this)};function Wa(o,l){Ht(o);let h=[];if(typeof l=="string")Ga(o,l)&&(h=h.concat(o.g.get(cn(o,l))));else for(o=Array.from(o.g.values()),l=0;l<o.length;l++)h=h.concat(o[l]);return h}n.set=function(o,l){return Ht(this),this.i=null,o=cn(this,o),Ga(this,o)&&(this.h-=this.g.get(o).length),this.g.set(o,[l]),this.h+=1,this},n.get=function(o,l){return o?(o=Wa(this,o),o.length>0?String(o[0]):l):l};function Ka(o,l,h){za(o,l),h.length>0&&(o.i=null,o.g.set(cn(o,l),S(h)),o.h+=h.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const o=[],l=Array.from(this.g.keys());for(let m=0;m<l.length;m++){var h=l[m];const w=xn(h);h=Wa(this,h);for(let b=0;b<h.length;b++){let V=w;h[b]!==""&&(V+="="+xn(h[b])),o.push(V)}}return this.i=o.join("&")};function Qa(o){const l=new qn;return l.i=o.i,o.g&&(l.g=new Map(o.g),l.h=o.h),l}function cn(o,l){return l=String(l),o.j&&(l=l.toLowerCase()),l}function Zd(o,l){l&&!o.j&&(Ht(o),o.i=null,o.g.forEach(function(h,m){const w=m.toLowerCase();m!=w&&(za(this,m),Ka(this,w,h))},o)),o.j=l}function ef(o,l){const h=new On;if(a.Image){const m=new Image;m.onload=f(pt,h,"TestLoadImage: loaded",!0,l,m),m.onerror=f(pt,h,"TestLoadImage: error",!1,l,m),m.onabort=f(pt,h,"TestLoadImage: abort",!1,l,m),m.ontimeout=f(pt,h,"TestLoadImage: timeout",!1,l,m),a.setTimeout(function(){m.ontimeout&&m.ontimeout()},1e4),m.src=o}else l(!1)}function tf(o,l){const h=new On,m=new AbortController,w=setTimeout(()=>{m.abort(),pt(h,"TestPingServer: timeout",!1,l)},1e4);fetch(o,{signal:m.signal}).then(b=>{clearTimeout(w),b.ok?pt(h,"TestPingServer: ok",!0,l):pt(h,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(w),pt(h,"TestPingServer: error",!1,l)})}function pt(o,l,h,m,w){try{w&&(w.onload=null,w.onerror=null,w.onabort=null,w.ontimeout=null),m(h)}catch{}}function nf(){this.g=new Ud}function Ci(o){this.i=o.Sb||null,this.h=o.ab||!1}p(Ci,ba),Ci.prototype.g=function(){return new xs(this.i,this.h)};function xs(o,l){ve.call(this),this.H=o,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.A=new Headers,this.h=null,this.F="GET",this.D="",this.g=!1,this.B=this.j=this.l=null,this.v=new AbortController}p(xs,ve),n=xs.prototype,n.open=function(o,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.F=o,this.D=l,this.readyState=1,zn(this)},n.send=function(o){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");if(this.v.signal.aborted)throw this.abort(),Error("Request was aborted.");this.g=!0;const l={headers:this.A,method:this.F,credentials:this.m,cache:void 0,signal:this.v.signal};o&&(l.body=o),(this.H||a).fetch(new Request(this.D,l)).then(this.Pa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.A=new Headers,this.status=0,this.v.abort(),this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),this.readyState>=1&&this.g&&this.readyState!=4&&(this.g=!1,Hn(this)),this.readyState=0},n.Pa=function(o){if(this.g&&(this.l=o,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=o.headers,this.readyState=2,zn(this)),this.g&&(this.readyState=3,zn(this),this.g)))if(this.responseType==="arraybuffer")o.arrayBuffer().then(this.Na.bind(this),this.ga.bind(this));else if(typeof a.ReadableStream<"u"&&"body"in o){if(this.j=o.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.B=new TextDecoder;Ja(this)}else o.text().then(this.Oa.bind(this),this.ga.bind(this))};function Ja(o){o.j.read().then(o.Ma.bind(o)).catch(o.ga.bind(o))}n.Ma=function(o){if(this.g){if(this.o&&o.value)this.response.push(o.value);else if(!this.o){var l=o.value?o.value:new Uint8Array(0);(l=this.B.decode(l,{stream:!o.done}))&&(this.response=this.responseText+=l)}o.done?Hn(this):zn(this),this.readyState==3&&Ja(this)}},n.Oa=function(o){this.g&&(this.response=this.responseText=o,Hn(this))},n.Na=function(o){this.g&&(this.response=o,Hn(this))},n.ga=function(){this.g&&Hn(this)};function Hn(o){o.readyState=4,o.l=null,o.j=null,o.B=null,zn(o)}n.setRequestHeader=function(o,l){this.A.append(o,l)},n.getResponseHeader=function(o){return this.h&&this.h.get(o.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const o=[],l=this.h.entries();for(var h=l.next();!h.done;)h=h.value,o.push(h[0]+": "+h[1]),h=l.next();return o.join(`\r
`)};function zn(o){o.onreadystatechange&&o.onreadystatechange.call(o)}Object.defineProperty(xs.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(o){this.m=o?"include":"same-origin"}});function Xa(o){let l="";return ks(o,function(h,m){l+=m,l+=":",l+=h,l+=`\r
`}),l}function Pi(o,l,h){e:{for(m in h){var m=!1;break e}m=!0}m||(h=Xa(h),typeof o=="string"?h!=null&&xn(h):ee(o,l,h))}function re(o){ve.call(this),this.headers=new Map,this.L=o||null,this.h=!1,this.g=null,this.D="",this.o=0,this.l="",this.j=this.B=this.v=this.A=!1,this.m=null,this.F="",this.H=!1}p(re,ve);var sf=/^https?$/i,rf=["POST","PUT"];n=re.prototype,n.Fa=function(o){this.H=o},n.ea=function(o,l,h,m){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+o);l=l?l.toUpperCase():"GET",this.D=o,this.l="",this.o=0,this.A=!1,this.h=!0,this.g=this.L?this.L.g():Na.g(),this.g.onreadystatechange=y(d(this.Ca,this));try{this.B=!0,this.g.open(l,String(o),!0),this.B=!1}catch(b){Ya(this,b);return}if(o=h||"",h=new Map(this.headers),m)if(Object.getPrototypeOf(m)===Object.prototype)for(var w in m)h.set(w,m[w]);else if(typeof m.keys=="function"&&typeof m.get=="function")for(const b of m.keys())h.set(b,m.get(b));else throw Error("Unknown input type for opt_headers: "+String(m));m=Array.from(h.keys()).find(b=>b.toLowerCase()=="content-type"),w=a.FormData&&o instanceof a.FormData,!(Array.prototype.indexOf.call(rf,l,void 0)>=0)||m||w||h.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[b,V]of h)this.g.setRequestHeader(b,V);this.F&&(this.g.responseType=this.F),"withCredentials"in this.g&&this.g.withCredentials!==this.H&&(this.g.withCredentials=this.H);try{this.m&&(clearTimeout(this.m),this.m=null),this.v=!0,this.g.send(o),this.v=!1}catch(b){Ya(this,b)}};function Ya(o,l){o.h=!1,o.g&&(o.j=!0,o.g.abort(),o.j=!1),o.l=l,o.o=5,Za(o),Us(o)}function Za(o){o.A||(o.A=!0,Se(o,"complete"),Se(o,"error"))}n.abort=function(o){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.o=o||7,Se(this,"complete"),Se(this,"abort"),Us(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Us(this,!0)),re.Z.N.call(this)},n.Ca=function(){this.u||(this.B||this.v||this.j?ec(this):this.Xa())},n.Xa=function(){ec(this)};function ec(o){if(o.h&&typeof i<"u"){if(o.v&&gt(o)==4)setTimeout(o.Ca.bind(o),0);else if(Se(o,"readystatechange"),gt(o)==4){o.h=!1;try{const b=o.ca();e:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break e;default:l=!1}var h;if(!(h=l)){var m;if(m=b===0){let V=String(o.D).match(qa)[1]||null;!V&&a.self&&a.self.location&&(V=a.self.location.protocol.slice(0,-1)),m=!sf.test(V?V.toLowerCase():"")}h=m}if(h)Se(o,"complete"),Se(o,"success");else{o.o=6;try{var w=gt(o)>2?o.g.statusText:""}catch{w=""}o.l=w+" ["+o.ca()+"]",Za(o)}}finally{Us(o)}}}}function Us(o,l){if(o.g){o.m&&(clearTimeout(o.m),o.m=null);const h=o.g;o.g=null,l||Se(o,"ready");try{h.onreadystatechange=null}catch{}}}n.isActive=function(){return!!this.g};function gt(o){return o.g?o.g.readyState:0}n.ca=function(){try{return gt(this)>2?this.g.status:-1}catch{return-1}},n.la=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.La=function(o){if(this.g){var l=this.g.responseText;return o&&l.indexOf(o)==0&&(l=l.substring(o.length)),xd(l)}};function tc(o){try{if(!o.g)return null;if("response"in o.g)return o.g.response;switch(o.F){case"":case"text":return o.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in o.g)return o.g.mozResponseArrayBuffer}return null}catch{return null}}function of(o){const l={};o=(o.g&&gt(o)>=2&&o.g.getAllResponseHeaders()||"").split(`\r
`);for(let m=0;m<o.length;m++){if(_(o[m]))continue;var h=qd(o[m]);const w=h[0];if(h=h[1],typeof h!="string")continue;h=h.trim();const b=l[w]||[];l[w]=b,b.push(h)}Vd(l,function(m){return m.join(", ")})}n.ya=function(){return this.o},n.Ha=function(){return typeof this.l=="string"?this.l:String(this.l)};function Gn(o,l,h){return h&&h.internalChannelParams&&h.internalChannelParams[o]||l}function nc(o){this.za=0,this.i=[],this.j=new On,this.ba=this.na=this.J=this.W=this.g=this.wa=this.G=this.H=this.u=this.U=this.o=null,this.Ya=this.V=0,this.Sa=Gn("failFast",!1,o),this.F=this.C=this.v=this.m=this.l=null,this.X=!0,this.xa=this.K=-1,this.Y=this.A=this.D=0,this.Qa=Gn("baseRetryDelayMs",5e3,o),this.Za=Gn("retryDelaySeedMs",1e4,o),this.Ta=Gn("forwardChannelMaxRetries",2,o),this.va=Gn("forwardChannelRequestTimeoutMs",2e4,o),this.ma=o&&o.xmlHttpFactory||void 0,this.Ua=o&&o.Rb||void 0,this.Aa=o&&o.useFetchStreams||!1,this.O=void 0,this.L=o&&o.supportsCrossDomainXhr||!1,this.M="",this.h=new Ua(o&&o.concurrentRequestLimit),this.Ba=new nf,this.S=o&&o.fastHandshake||!1,this.R=o&&o.encodeInitMessageHeaders||!1,this.S&&this.R&&(this.R=!1),this.Ra=o&&o.Pb||!1,o&&o.ua&&this.j.ua(),o&&o.forceLongPolling&&(this.X=!1),this.aa=!this.S&&this.X&&o&&o.detectBufferingProxy||!1,this.ia=void 0,o&&o.longPollingTimeout&&o.longPollingTimeout>0&&(this.ia=o.longPollingTimeout),this.ta=void 0,this.T=0,this.P=!1,this.ja=this.B=null}n=nc.prototype,n.ka=8,n.I=1,n.connect=function(o,l,h,m){Re(0),this.W=o,this.H=l||{},h&&m!==void 0&&(this.H.OSID=h,this.H.OAID=m),this.F=this.X,this.J=hc(this,null,this.W),Bs(this)};function ki(o){if(sc(o),o.I==3){var l=o.V++,h=He(o.J);if(ee(h,"SID",o.M),ee(h,"RID",l),ee(h,"TYPE","terminate"),Wn(o,h),l=new ft(o,o.j,l),l.M=2,l.A=Os(He(h)),h=!1,a.navigator&&a.navigator.sendBeacon)try{h=a.navigator.sendBeacon(l.A.toString(),"")}catch{}!h&&a.Image&&(new Image().src=l.A,h=!0),h||(l.g=dc(l.j,null),l.g.ea(l.A)),l.F=Date.now(),Ms(l)}uc(o)}function Fs(o){o.g&&(Ni(o),o.g.cancel(),o.g=null)}function sc(o){Fs(o),o.v&&(a.clearTimeout(o.v),o.v=null),js(o),o.h.cancel(),o.m&&(typeof o.m=="number"&&a.clearTimeout(o.m),o.m=null)}function Bs(o){if(!Fa(o.h)&&!o.m){o.m=!0;var l=o.Ea;de||g(),se||(de(),se=!0),v.add(l,o),o.D=0}}function af(o,l){return Ba(o.h)>=o.h.j-(o.m?1:0)?!1:o.m?(o.i=l.G.concat(o.i),!0):o.I==1||o.I==2||o.D>=(o.Sa?0:o.Ta)?!1:(o.m=Mn(d(o.Ea,o,l),lc(o,o.D)),o.D++,!0)}n.Ea=function(o){if(this.m)if(this.m=null,this.I==1){if(!o){this.V=Math.floor(Math.random()*1e5),o=this.V++;const w=new ft(this,this.j,o);let b=this.o;if(this.U&&(b?(b=pa(b),_a(b,this.U)):b=this.U),this.u!==null||this.R||(w.J=b,b=null),this.S)e:{for(var l=0,h=0;h<this.i.length;h++){t:{var m=this.i[h];if("__data__"in m.map&&(m=m.map.__data__,typeof m=="string")){m=m.length;break t}m=void 0}if(m===void 0)break;if(l+=m,l>4096){l=h;break e}if(l===4096||h===this.i.length-1){l=h+1;break e}}l=1e3}else l=1e3;l=ic(this,w,l),h=He(this.J),ee(h,"RID",o),ee(h,"CVER",22),this.G&&ee(h,"X-HTTP-Session-Id",this.G),Wn(this,h),b&&(this.R?l="headers="+xn(Xa(b))+"&"+l:this.u&&Pi(h,this.u,b)),Si(this.h,w),this.Ra&&ee(h,"TYPE","init"),this.S?(ee(h,"$req",l),ee(h,"SID","null"),w.U=!0,Ti(w,h,null)):Ti(w,h,l),this.I=2}}else this.I==3&&(o?rc(this,o):this.i.length==0||Fa(this.h)||rc(this))};function rc(o,l){var h;l?h=l.l:h=o.V++;const m=He(o.J);ee(m,"SID",o.M),ee(m,"RID",h),ee(m,"AID",o.K),Wn(o,m),o.u&&o.o&&Pi(m,o.u,o.o),h=new ft(o,o.j,h,o.D+1),o.u===null&&(h.J=o.o),l&&(o.i=l.G.concat(o.i)),l=ic(o,h,1e3),h.H=Math.round(o.va*.5)+Math.round(o.va*.5*Math.random()),Si(o.h,h),Ti(h,m,l)}function Wn(o,l){o.H&&ks(o.H,function(h,m){ee(l,m,h)}),o.l&&ks({},function(h,m){ee(l,m,h)})}function ic(o,l,h){h=Math.min(o.i.length,h);const m=o.l?d(o.l.Ka,o.l,o):null;e:{var w=o.i;let $=-1;for(;;){const fe=["count="+h];$==-1?h>0?($=w[0].g,fe.push("ofs="+$)):$=0:fe.push("ofs="+$);let Y=!0;for(let pe=0;pe<h;pe++){var b=w[pe].g;const ze=w[pe].map;if(b-=$,b<0)$=Math.max(0,w[pe].g-100),Y=!1;else try{b="req"+b+"_"||"";try{var V=ze instanceof Map?ze:Object.entries(ze);for(const[Gt,_t]of V){let yt=_t;c(_t)&&(yt=_i(_t)),fe.push(b+Gt+"="+encodeURIComponent(yt))}}catch(Gt){throw fe.push(b+"type="+encodeURIComponent("_badmap")),Gt}}catch{m&&m(ze)}}if(Y){V=fe.join("&");break e}}V=void 0}return o=o.i.splice(0,h),l.G=o,V}function oc(o){if(!o.g&&!o.v){o.Y=1;var l=o.Da;de||g(),se||(de(),se=!0),v.add(l,o),o.A=0}}function Vi(o){return o.g||o.v||o.A>=3?!1:(o.Y++,o.v=Mn(d(o.Da,o),lc(o,o.A)),o.A++,!0)}n.Da=function(){if(this.v=null,ac(this),this.aa&&!(this.P||this.g==null||this.T<=0)){var o=4*this.T;this.j.info("BP detection timer enabled: "+o),this.B=Mn(d(this.Wa,this),o)}},n.Wa=function(){this.B&&(this.B=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.P=!0,Re(10),Fs(this),ac(this))};function Ni(o){o.B!=null&&(a.clearTimeout(o.B),o.B=null)}function ac(o){o.g=new ft(o,o.j,"rpc",o.Y),o.u===null&&(o.g.J=o.o),o.g.P=0;var l=He(o.na);ee(l,"RID","rpc"),ee(l,"SID",o.M),ee(l,"AID",o.K),ee(l,"CI",o.F?"0":"1"),!o.F&&o.ia&&ee(l,"TO",o.ia),ee(l,"TYPE","xmlhttp"),Wn(o,l),o.u&&o.o&&Pi(l,o.u,o.o),o.O&&(o.g.H=o.O);var h=o.g;o=o.ba,h.M=1,h.A=Os(He(l)),h.u=null,h.R=!0,Ma(h,o)}n.Va=function(){this.C!=null&&(this.C=null,Fs(this),Vi(this),Re(19))};function js(o){o.C!=null&&(a.clearTimeout(o.C),o.C=null)}function cc(o,l){var h=null;if(o.g==l){js(o),Ni(o),o.g=null;var m=2}else if(bi(o.h,l))h=l.G,ja(o.h,l),m=1;else return;if(o.I!=0){if(l.o)if(m==1){h=l.u?l.u.length:0,l=Date.now()-l.F;var w=o.D;m=Ds(),Se(m,new ka(m,h)),Bs(o)}else oc(o);else if(w=l.m,w==3||w==0&&l.X>0||!(m==1&&af(o,l)||m==2&&Vi(o)))switch(h&&h.length>0&&(l=o.h,l.i=l.i.concat(h)),w){case 1:zt(o,5);break;case 4:zt(o,10);break;case 3:zt(o,6);break;default:zt(o,2)}}}function lc(o,l){let h=o.Qa+Math.floor(Math.random()*o.Za);return o.isActive()||(h*=2),h*l}function zt(o,l){if(o.j.info("Error code "+l),l==2){var h=d(o.bb,o),m=o.Ua;const w=!m;m=new mt(m||"//www.google.com/images/cleardot.gif"),a.location&&a.location.protocol=="http"||Fn(m,"https"),Os(m),w?ef(m.toString(),h):tf(m.toString(),h)}else Re(2);o.I=0,o.l&&o.l.pa(l),uc(o),sc(o)}n.bb=function(o){o?(this.j.info("Successfully pinged google.com"),Re(2)):(this.j.info("Failed to ping google.com"),Re(1))};function uc(o){if(o.I=0,o.ja=[],o.l){const l=$a(o.h);(l.length!=0||o.i.length!=0)&&(P(o.ja,l),P(o.ja,o.i),o.h.i.length=0,S(o.i),o.i.length=0),o.l.oa()}}function hc(o,l,h){var m=h instanceof mt?He(h):new mt(h);if(m.g!="")l&&(m.g=l+"."+m.g),Bn(m,m.u);else{var w=a.location;m=w.protocol,l=l?l+"."+w.hostname:w.hostname,w=+w.port;const b=new mt(null);m&&Fn(b,m),l&&(b.g=l),w&&Bn(b,w),h&&(b.h=h),m=b}return h=o.G,l=o.wa,h&&l&&ee(m,h,l),ee(m,"VER",o.ka),Wn(o,m),m}function dc(o,l,h){if(l&&!o.L)throw Error("Can't create secondary domain capable XhrIo object.");return l=o.Aa&&!o.ma?new re(new Ci({ab:h})):new re(o.ma),l.Fa(o.L),l}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function fc(){}n=fc.prototype,n.ra=function(){},n.qa=function(){},n.pa=function(){},n.oa=function(){},n.isActive=function(){return!0},n.Ka=function(){};function $s(){}$s.prototype.g=function(o,l){return new De(o,l)};function De(o,l){ve.call(this),this.g=new nc(l),this.l=o,this.h=l&&l.messageUrlParams||null,o=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(o?o["X-Client-Protocol"]="webchannel":o={"X-Client-Protocol":"webchannel"}),this.g.o=o,o=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(o?o["X-WebChannel-Content-Type"]=l.messageContentType:o={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.sa&&(o?o["X-WebChannel-Client-Profile"]=l.sa:o={"X-WebChannel-Client-Profile":l.sa}),this.g.U=o,(o=l&&l.Qb)&&!_(o)&&(this.g.u=o),this.A=l&&l.supportsCrossDomainXhr||!1,this.v=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!_(l)&&(this.g.G=l,o=this.h,o!==null&&l in o&&(o=this.h,l in o&&delete o[l])),this.j=new ln(this)}p(De,ve),De.prototype.m=function(){this.g.l=this.j,this.A&&(this.g.L=!0),this.g.connect(this.l,this.h||void 0)},De.prototype.close=function(){ki(this.g)},De.prototype.o=function(o){var l=this.g;if(typeof o=="string"){var h={};h.__data__=o,o=h}else this.v&&(h={},h.__data__=_i(o),o=h);l.i.push(new Gd(l.Ya++,o)),l.I==3&&Bs(l)},De.prototype.N=function(){this.g.l=null,delete this.j,ki(this.g),delete this.g,De.Z.N.call(this)};function mc(o){yi.call(this),o.__headers__&&(this.headers=o.__headers__,this.statusCode=o.__status__,delete o.__headers__,delete o.__status__);var l=o.__sm__;if(l){e:{for(const h in l){o=h;break e}o=void 0}(this.i=o)&&(o=this.i,l=l!==null&&o in l?l[o]:void 0),this.data=l}else this.data=o}p(mc,yi);function pc(){Ei.call(this),this.status=1}p(pc,Ei);function ln(o){this.g=o}p(ln,fc),ln.prototype.ra=function(){Se(this.g,"a")},ln.prototype.qa=function(o){Se(this.g,new mc(o))},ln.prototype.pa=function(o){Se(this.g,new pc)},ln.prototype.oa=function(){Se(this.g,"b")},$s.prototype.createWebChannel=$s.prototype.g,De.prototype.send=De.prototype.o,De.prototype.open=De.prototype.m,De.prototype.close=De.prototype.close,Xu=function(){return new $s},Ju=function(){return Ds()},Qu=$t,no={jb:0,mb:1,nb:2,Hb:3,Mb:4,Jb:5,Kb:6,Ib:7,Gb:8,Lb:9,PROXY:10,NOPROXY:11,Eb:12,Ab:13,Bb:14,zb:15,Cb:16,Db:17,fb:18,eb:19,gb:20},Ls.NO_ERROR=0,Ls.TIMEOUT=8,Ls.HTTP_ERROR=6,tr=Ls,Va.COMPLETE="complete",Ku=Va,Sa.EventType=Dn,Dn.OPEN="a",Dn.CLOSE="b",Dn.ERROR="c",Dn.MESSAGE="d",ve.prototype.listen=ve.prototype.J,Kn=Sa,re.prototype.listenOnce=re.prototype.K,re.prototype.getLastError=re.prototype.Ha,re.prototype.getLastErrorCode=re.prototype.ya,re.prototype.getStatus=re.prototype.ca,re.prototype.getResponseJson=re.prototype.La,re.prototype.getResponseText=re.prototype.la,re.prototype.send=re.prototype.ea,re.prototype.setWithCredentials=re.prototype.Fa,Wu=re}).apply(typeof zs<"u"?zs:typeof self<"u"?self:typeof window<"u"?window:{});const zc="@firebase/firestore",Gc="4.9.2";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class we{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}we.UNAUTHENTICATED=new we(null),we.GOOGLE_CREDENTIALS=new we("google-credentials-uid"),we.FIRST_PARTY=new we("first-party-uid"),we.MOCK_USER=new we("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Rn="12.3.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const en=new wo("@firebase/firestore");function un(){return en.logLevel}function L(n,...e){if(en.logLevel<=z.DEBUG){const t=e.map(No);en.debug(`Firestore (${Rn}): ${n}`,...t)}}function lt(n,...e){if(en.logLevel<=z.ERROR){const t=e.map(No);en.error(`Firestore (${Rn}): ${n}`,...t)}}function En(n,...e){if(en.logLevel<=z.WARN){const t=e.map(No);en.warn(`Firestore (${Rn}): ${n}`,...t)}}function No(n){if(typeof n=="string")return n;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(t){return JSON.stringify(t)})(n)}catch{return n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function x(n,e,t){let s="Unexpected state";typeof e=="string"?s=e:t=e,Yu(n,s,t)}function Yu(n,e,t){let s=`FIRESTORE (${Rn}) INTERNAL ASSERTION FAILED: ${e} (ID: ${n.toString(16)})`;if(t!==void 0)try{s+=" CONTEXT: "+JSON.stringify(t)}catch{s+=" CONTEXT: "+t}throw lt(s),new Error(s)}function J(n,e,t,s){let r="Unexpected state";typeof t=="string"?r=t:s=t,n||Yu(e,r,s)}function B(n,e){return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const R={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class N extends qe{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rt{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zu{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class Hg{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(we.UNAUTHENTICATED)))}shutdown(){}}class zg{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable((()=>t(this.token.user)))}shutdown(){this.changeListener=null}}class Gg{constructor(e){this.t=e,this.currentUser=we.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){J(this.o===void 0,42304);let s=this.i;const r=u=>this.i!==s?(s=this.i,t(u)):Promise.resolve();let i=new rt;this.o=()=>{this.i++,this.currentUser=this.u(),i.resolve(),i=new rt,e.enqueueRetryable((()=>r(this.currentUser)))};const a=()=>{const u=i;e.enqueueRetryable((async()=>{await u.promise,await r(this.currentUser)}))},c=u=>{L("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=u,this.o&&(this.auth.addAuthTokenListener(this.o),a())};this.t.onInit((u=>c(u))),setTimeout((()=>{if(!this.auth){const u=this.t.getImmediate({optional:!0});u?c(u):(L("FirebaseAuthCredentialsProvider","Auth not yet detected"),i.resolve(),i=new rt)}}),0),a()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((s=>this.i!==e?(L("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):s?(J(typeof s.accessToken=="string",31837,{l:s}),new Zu(s.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return J(e===null||typeof e=="string",2055,{h:e}),new we(e)}}class Wg{constructor(e,t,s){this.P=e,this.T=t,this.I=s,this.type="FirstParty",this.user=we.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class Kg{constructor(e,t,s){this.P=e,this.T=t,this.I=s}getToken(){return Promise.resolve(new Wg(this.P,this.T,this.I))}start(e,t){e.enqueueRetryable((()=>t(we.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class Wc{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Qg{constructor(e,t){this.V=t,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,Le(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,t){J(this.o===void 0,3512);const s=i=>{i.error!=null&&L("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${i.error.message}`);const a=i.token!==this.m;return this.m=i.token,L("FirebaseAppCheckTokenProvider",`Received ${a?"new":"existing"} token.`),a?t(i.token):Promise.resolve()};this.o=i=>{e.enqueueRetryable((()=>s(i)))};const r=i=>{L("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=i,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((i=>r(i))),setTimeout((()=>{if(!this.appCheck){const i=this.V.getImmediate({optional:!0});i?r(i):L("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new Wc(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(J(typeof t.token=="string",44558,{tokenResult:t}),this.m=t.token,new Wc(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jg(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let s=0;s<n;s++)t[s]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Do{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=62*Math.floor(4.129032258064516);let s="";for(;s.length<20;){const r=Jg(40);for(let i=0;i<r.length;++i)s.length<20&&r[i]<t&&(s+=e.charAt(r[i]%62))}return s}}function G(n,e){return n<e?-1:n>e?1:0}function so(n,e){const t=Math.min(n.length,e.length);for(let s=0;s<t;s++){const r=n.charAt(s),i=e.charAt(s);if(r!==i)return ji(r)===ji(i)?G(r,i):ji(r)?1:-1}return G(n.length,e.length)}const Xg=55296,Yg=57343;function ji(n){const e=n.charCodeAt(0);return e>=Xg&&e<=Yg}function In(n,e,t){return n.length===e.length&&n.every(((s,r)=>t(s,e[r])))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Kc="__name__";class Ge{constructor(e,t,s){t===void 0?t=0:t>e.length&&x(637,{offset:t,range:e.length}),s===void 0?s=e.length-t:s>e.length-t&&x(1746,{length:s,range:e.length-t}),this.segments=e,this.offset=t,this.len=s}get length(){return this.len}isEqual(e){return Ge.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Ge?e.forEach((s=>{t.push(s)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,s=this.limit();t<s;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const s=Math.min(e.length,t.length);for(let r=0;r<s;r++){const i=Ge.compareSegments(e.get(r),t.get(r));if(i!==0)return i}return G(e.length,t.length)}static compareSegments(e,t){const s=Ge.isNumericId(e),r=Ge.isNumericId(t);return s&&!r?-1:!s&&r?1:s&&r?Ge.extractNumericId(e).compare(Ge.extractNumericId(t)):so(e,t)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Pt.fromString(e.substring(4,e.length-2))}}class Z extends Ge{construct(e,t,s){return new Z(e,t,s)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const s of e){if(s.indexOf("//")>=0)throw new N(R.INVALID_ARGUMENT,`Invalid segment (${s}). Paths must not contain // in them.`);t.push(...s.split("/").filter((r=>r.length>0)))}return new Z(t)}static emptyPath(){return new Z([])}}const Zg=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ye extends Ge{construct(e,t,s){return new ye(e,t,s)}static isValidIdentifier(e){return Zg.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ye.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===Kc}static keyField(){return new ye([Kc])}static fromServerFormat(e){const t=[];let s="",r=0;const i=()=>{if(s.length===0)throw new N(R.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(s),s=""};let a=!1;for(;r<e.length;){const c=e[r];if(c==="\\"){if(r+1===e.length)throw new N(R.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const u=e[r+1];if(u!=="\\"&&u!=="."&&u!=="`")throw new N(R.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);s+=u,r+=2}else c==="`"?(a=!a,r++):c!=="."||a?(s+=c,r++):(i(),r++)}if(i(),a)throw new N(R.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new ye(t)}static emptyPath(){return new ye([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O{constructor(e){this.path=e}static fromPath(e){return new O(Z.fromString(e))}static fromName(e){return new O(Z.fromString(e).popFirst(5))}static empty(){return new O(Z.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&Z.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return Z.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new O(new Z(e.slice()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function eh(n,e,t){if(!t)throw new N(R.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function e_(n,e,t,s){if(e===!0&&s===!0)throw new N(R.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function Qc(n){if(!O.isDocumentKey(n))throw new N(R.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function Jc(n){if(O.isDocumentKey(n))throw new N(R.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function th(n){return typeof n=="object"&&n!==null&&(Object.getPrototypeOf(n)===Object.prototype||Object.getPrototypeOf(n)===null)}function Br(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=(function(s){return s.constructor?s.constructor.name:null})(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":x(12329,{type:typeof n})}function Oe(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new N(R.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Br(n);throw new N(R.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function he(n,e){const t={typeString:n};return e&&(t.value=e),t}function Es(n,e){if(!th(n))throw new N(R.INVALID_ARGUMENT,"JSON must be an object");let t;for(const s in e)if(e[s]){const r=e[s].typeString,i="value"in e[s]?{value:e[s].value}:void 0;if(!(s in n)){t=`JSON missing required field: '${s}'`;break}const a=n[s];if(r&&typeof a!==r){t=`JSON field '${s}' must be a ${r}.`;break}if(i!==void 0&&a!==i.value){t=`Expected '${s}' field to equal '${i.value}'`;break}}if(t)throw new N(R.INVALID_ARGUMENT,t);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xc=-62135596800,Yc=1e6;class te{static now(){return te.fromMillis(Date.now())}static fromDate(e){return te.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),s=Math.floor((e-1e3*t)*Yc);return new te(t,s)}constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new N(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new N(R.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<Xc)throw new N(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new N(R.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/Yc}_compareTo(e){return this.seconds===e.seconds?G(this.nanoseconds,e.nanoseconds):G(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:te._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Es(e,te._jsonSchema))return new te(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-Xc;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}te._jsonSchemaVersion="firestore/timestamp/1.0",te._jsonSchema={type:he("string",te._jsonSchemaVersion),seconds:he("number"),nanoseconds:he("number")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class F{static fromTimestamp(e){return new F(e)}static min(){return new F(new te(0,0))}static max(){return new F(new te(253402300799,999999999))}constructor(e){this.timestamp=e}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const os=-1;function t_(n,e){const t=n.toTimestamp().seconds,s=n.toTimestamp().nanoseconds+1,r=F.fromTimestamp(s===1e9?new te(t+1,0):new te(t,s));return new Dt(r,O.empty(),e)}function n_(n){return new Dt(n.readTime,n.key,os)}class Dt{constructor(e,t,s){this.readTime=e,this.documentKey=t,this.largestBatchId=s}static min(){return new Dt(F.min(),O.empty(),os)}static max(){return new Dt(F.max(),O.empty(),os)}}function s_(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=O.comparator(n.documentKey,e.documentKey),t!==0?t:G(n.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const r_="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class i_{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Cn(n){if(n.code!==R.FAILED_PRECONDITION||n.message!==r_)throw n;L("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class C{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&x(59440),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new C(((s,r)=>{this.nextCallback=i=>{this.wrapSuccess(e,i).next(s,r)},this.catchCallback=i=>{this.wrapFailure(t,i).next(s,r)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof C?t:C.resolve(t)}catch(t){return C.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):C.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):C.reject(t)}static resolve(e){return new C(((t,s)=>{t(e)}))}static reject(e){return new C(((t,s)=>{s(e)}))}static waitFor(e){return new C(((t,s)=>{let r=0,i=0,a=!1;e.forEach((c=>{++r,c.next((()=>{++i,a&&i===r&&t()}),(u=>s(u)))})),a=!0,i===r&&t()}))}static or(e){let t=C.resolve(!1);for(const s of e)t=t.next((r=>r?C.resolve(r):s()));return t}static forEach(e,t){const s=[];return e.forEach(((r,i)=>{s.push(t.call(this,r,i))})),this.waitFor(s)}static mapArray(e,t){return new C(((s,r)=>{const i=e.length,a=new Array(i);let c=0;for(let u=0;u<i;u++){const d=u;t(e[d]).next((f=>{a[d]=f,++c,c===i&&s(a)}),(f=>r(f)))}}))}static doWhile(e,t){return new C(((s,r)=>{const i=()=>{e()===!0?t().next((()=>{i()}),r):s()};i()}))}}function o_(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}function Pn(n){return n.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jr{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=s=>this.ae(s),this.ue=s=>t.writeSequenceNumber(s))}ae(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.ue&&this.ue(e),e}}jr.ce=-1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lo=-1;function $r(n){return n==null}function pr(n){return n===0&&1/n==-1/0}function a_(n){return typeof n=="number"&&Number.isInteger(n)&&!pr(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nh="";function c_(n){let e="";for(let t=0;t<n.length;t++)e.length>0&&(e=Zc(e)),e=l_(n.get(t),e);return Zc(e)}function l_(n,e){let t=e;const s=n.length;for(let r=0;r<s;r++){const i=n.charAt(r);switch(i){case"\0":t+="";break;case nh:t+="";break;default:t+=i}}return t}function Zc(n){return n+nh+""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function el(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function Ft(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function sh(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ne{constructor(e,t){this.comparator=e,this.root=t||_e.EMPTY}insert(e,t){return new ne(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,_e.BLACK,null,null))}remove(e){return new ne(this.comparator,this.root.remove(e,this.comparator).copy(null,null,_e.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const s=this.comparator(e,t.key);if(s===0)return t.value;s<0?t=t.left:s>0&&(t=t.right)}return null}indexOf(e){let t=0,s=this.root;for(;!s.isEmpty();){const r=this.comparator(e,s.key);if(r===0)return t+s.left.size;r<0?s=s.left:(t+=s.left.size+1,s=s.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,s)=>(e(t,s),!1)))}toString(){const e=[];return this.inorderTraversal(((t,s)=>(e.push(`${t}:${s}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new Gs(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new Gs(this.root,e,this.comparator,!1)}getReverseIterator(){return new Gs(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new Gs(this.root,e,this.comparator,!0)}}class Gs{constructor(e,t,s,r){this.isReverse=r,this.nodeStack=[];let i=1;for(;!e.isEmpty();)if(i=t?s(e.key,t):1,t&&r&&(i*=-1),i<0)e=this.isReverse?e.left:e.right;else{if(i===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class _e{constructor(e,t,s,r,i){this.key=e,this.value=t,this.color=s??_e.RED,this.left=r??_e.EMPTY,this.right=i??_e.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,s,r,i){return new _e(e??this.key,t??this.value,s??this.color,r??this.left,i??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,s){let r=this;const i=s(e,r.key);return r=i<0?r.copy(null,null,null,r.left.insert(e,t,s),null):i===0?r.copy(null,t,null,null,null):r.copy(null,null,null,null,r.right.insert(e,t,s)),r.fixUp()}removeMin(){if(this.left.isEmpty())return _e.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let s,r=this;if(t(e,r.key)<0)r.left.isEmpty()||r.left.isRed()||r.left.left.isRed()||(r=r.moveRedLeft()),r=r.copy(null,null,null,r.left.remove(e,t),null);else{if(r.left.isRed()&&(r=r.rotateRight()),r.right.isEmpty()||r.right.isRed()||r.right.left.isRed()||(r=r.moveRedRight()),t(e,r.key)===0){if(r.right.isEmpty())return _e.EMPTY;s=r.right.min(),r=r.copy(s.key,s.value,null,null,r.right.removeMin())}r=r.copy(null,null,null,null,r.right.remove(e,t))}return r.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,_e.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,_e.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw x(43730,{key:this.key,value:this.value});if(this.right.isRed())throw x(14113,{key:this.key,value:this.value});const e=this.left.check();if(e!==this.right.check())throw x(27949);return e+(this.isRed()?0:1)}}_e.EMPTY=null,_e.RED=!0,_e.BLACK=!1;_e.EMPTY=new class{constructor(){this.size=0}get key(){throw x(57766)}get value(){throw x(16141)}get color(){throw x(16727)}get left(){throw x(29726)}get right(){throw x(36894)}copy(e,t,s,r,i){return this}insert(e,t,s){return new _e(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(e){this.comparator=e,this.data=new ne(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,s)=>(e(t),!1)))}forEachInRange(e,t){const s=this.data.getIteratorFrom(e[0]);for(;s.hasNext();){const r=s.getNext();if(this.comparator(r.key,e[1])>=0)return;t(r.key)}}forEachWhile(e,t){let s;for(s=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();s.hasNext();)if(!e(s.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new tl(this.data.getIterator())}getIteratorFrom(e){return new tl(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((s=>{t=t.add(s)})),t}isEqual(e){if(!(e instanceof me)||this.size!==e.size)return!1;const t=this.data.getIterator(),s=e.data.getIterator();for(;t.hasNext();){const r=t.getNext().key,i=s.getNext().key;if(this.comparator(r,i)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new me(this.comparator);return t.data=e,t}}class tl{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Me{constructor(e){this.fields=e,e.sort(ye.comparator)}static empty(){return new Me([])}unionWith(e){let t=new me(ye.comparator);for(const s of this.fields)t=t.add(s);for(const s of e)t=t.add(s);return new Me(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return In(this.fields,e.fields,((t,s)=>t.isEqual(s)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rh extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ie{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(r){try{return atob(r)}catch(i){throw typeof DOMException<"u"&&i instanceof DOMException?new rh("Invalid base64 string: "+i):i}})(e);return new Ie(t)}static fromUint8Array(e){const t=(function(r){let i="";for(let a=0;a<r.length;++a)i+=String.fromCharCode(r[a]);return i})(e);return new Ie(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const s=new Uint8Array(t.length);for(let r=0;r<t.length;r++)s[r]=t.charCodeAt(r);return s})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return G(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Ie.EMPTY_BYTE_STRING=new Ie("");const u_=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function Lt(n){if(J(!!n,39018),typeof n=="string"){let e=0;const t=u_.exec(n);if(J(!!t,46558,{timestamp:n}),t[1]){let r=t[1];r=(r+"000000000").substr(0,9),e=Number(r)}const s=new Date(n);return{seconds:Math.floor(s.getTime()/1e3),nanos:e}}return{seconds:oe(n.seconds),nanos:oe(n.nanos)}}function oe(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Mt(n){return typeof n=="string"?Ie.fromBase64String(n):Ie.fromUint8Array(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ih="server_timestamp",oh="__type__",ah="__previous_value__",ch="__local_write_time__";function Mo(n){return(n?.mapValue?.fields||{})[oh]?.stringValue===ih}function qr(n){const e=n.mapValue.fields[ah];return Mo(e)?qr(e):e}function as(n){const e=Lt(n.mapValue.fields[ch].timestampValue);return new te(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class h_{constructor(e,t,s,r,i,a,c,u,d,f){this.databaseId=e,this.appId=t,this.persistenceKey=s,this.host=r,this.ssl=i,this.forceLongPolling=a,this.autoDetectLongPolling=c,this.longPollingOptions=u,this.useFetchStreams=d,this.isUsingEmulator=f}}const gr="(default)";class cs{constructor(e,t){this.projectId=e,this.database=t||gr}static empty(){return new cs("","")}get isDefaultDatabase(){return this.database===gr}isEqual(e){return e instanceof cs&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lh="__type__",d_="__max__",Ws={mapValue:{}},uh="__vector__",_r="value";function Ot(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?Mo(n)?4:m_(n)?9007199254740991:f_(n)?10:11:x(28295,{value:n})}function Ze(n,e){if(n===e)return!0;const t=Ot(n);if(t!==Ot(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return as(n).isEqual(as(e));case 3:return(function(r,i){if(typeof r.timestampValue=="string"&&typeof i.timestampValue=="string"&&r.timestampValue.length===i.timestampValue.length)return r.timestampValue===i.timestampValue;const a=Lt(r.timestampValue),c=Lt(i.timestampValue);return a.seconds===c.seconds&&a.nanos===c.nanos})(n,e);case 5:return n.stringValue===e.stringValue;case 6:return(function(r,i){return Mt(r.bytesValue).isEqual(Mt(i.bytesValue))})(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return(function(r,i){return oe(r.geoPointValue.latitude)===oe(i.geoPointValue.latitude)&&oe(r.geoPointValue.longitude)===oe(i.geoPointValue.longitude)})(n,e);case 2:return(function(r,i){if("integerValue"in r&&"integerValue"in i)return oe(r.integerValue)===oe(i.integerValue);if("doubleValue"in r&&"doubleValue"in i){const a=oe(r.doubleValue),c=oe(i.doubleValue);return a===c?pr(a)===pr(c):isNaN(a)&&isNaN(c)}return!1})(n,e);case 9:return In(n.arrayValue.values||[],e.arrayValue.values||[],Ze);case 10:case 11:return(function(r,i){const a=r.mapValue.fields||{},c=i.mapValue.fields||{};if(el(a)!==el(c))return!1;for(const u in a)if(a.hasOwnProperty(u)&&(c[u]===void 0||!Ze(a[u],c[u])))return!1;return!0})(n,e);default:return x(52216,{left:n})}}function ls(n,e){return(n.values||[]).find((t=>Ze(t,e)))!==void 0}function vn(n,e){if(n===e)return 0;const t=Ot(n),s=Ot(e);if(t!==s)return G(t,s);switch(t){case 0:case 9007199254740991:return 0;case 1:return G(n.booleanValue,e.booleanValue);case 2:return(function(i,a){const c=oe(i.integerValue||i.doubleValue),u=oe(a.integerValue||a.doubleValue);return c<u?-1:c>u?1:c===u?0:isNaN(c)?isNaN(u)?0:-1:1})(n,e);case 3:return nl(n.timestampValue,e.timestampValue);case 4:return nl(as(n),as(e));case 5:return so(n.stringValue,e.stringValue);case 6:return(function(i,a){const c=Mt(i),u=Mt(a);return c.compareTo(u)})(n.bytesValue,e.bytesValue);case 7:return(function(i,a){const c=i.split("/"),u=a.split("/");for(let d=0;d<c.length&&d<u.length;d++){const f=G(c[d],u[d]);if(f!==0)return f}return G(c.length,u.length)})(n.referenceValue,e.referenceValue);case 8:return(function(i,a){const c=G(oe(i.latitude),oe(a.latitude));return c!==0?c:G(oe(i.longitude),oe(a.longitude))})(n.geoPointValue,e.geoPointValue);case 9:return sl(n.arrayValue,e.arrayValue);case 10:return(function(i,a){const c=i.fields||{},u=a.fields||{},d=c[_r]?.arrayValue,f=u[_r]?.arrayValue,p=G(d?.values?.length||0,f?.values?.length||0);return p!==0?p:sl(d,f)})(n.mapValue,e.mapValue);case 11:return(function(i,a){if(i===Ws.mapValue&&a===Ws.mapValue)return 0;if(i===Ws.mapValue)return 1;if(a===Ws.mapValue)return-1;const c=i.fields||{},u=Object.keys(c),d=a.fields||{},f=Object.keys(d);u.sort(),f.sort();for(let p=0;p<u.length&&p<f.length;++p){const y=so(u[p],f[p]);if(y!==0)return y;const S=vn(c[u[p]],d[f[p]]);if(S!==0)return S}return G(u.length,f.length)})(n.mapValue,e.mapValue);default:throw x(23264,{he:t})}}function nl(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return G(n,e);const t=Lt(n),s=Lt(e),r=G(t.seconds,s.seconds);return r!==0?r:G(t.nanos,s.nanos)}function sl(n,e){const t=n.values||[],s=e.values||[];for(let r=0;r<t.length&&r<s.length;++r){const i=vn(t[r],s[r]);if(i)return i}return G(t.length,s.length)}function Tn(n){return ro(n)}function ro(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?(function(t){const s=Lt(t);return`time(${s.seconds},${s.nanos})`})(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?(function(t){return Mt(t).toBase64()})(n.bytesValue):"referenceValue"in n?(function(t){return O.fromName(t).toString()})(n.referenceValue):"geoPointValue"in n?(function(t){return`geo(${t.latitude},${t.longitude})`})(n.geoPointValue):"arrayValue"in n?(function(t){let s="[",r=!0;for(const i of t.values||[])r?r=!1:s+=",",s+=ro(i);return s+"]"})(n.arrayValue):"mapValue"in n?(function(t){const s=Object.keys(t.fields||{}).sort();let r="{",i=!0;for(const a of s)i?i=!1:r+=",",r+=`${a}:${ro(t.fields[a])}`;return r+"}"})(n.mapValue):x(61005,{value:n})}function nr(n){switch(Ot(n)){case 0:case 1:return 4;case 2:return 8;case 3:case 8:return 16;case 4:const e=qr(n);return e?16+nr(e):16;case 5:return 2*n.stringValue.length;case 6:return Mt(n.bytesValue).approximateByteSize();case 7:return n.referenceValue.length;case 9:return(function(s){return(s.values||[]).reduce(((r,i)=>r+nr(i)),0)})(n.arrayValue);case 10:case 11:return(function(s){let r=0;return Ft(s.fields,((i,a)=>{r+=i.length+nr(a)})),r})(n.mapValue);default:throw x(13486,{value:n})}}function rl(n,e){return{referenceValue:`projects/${n.projectId}/databases/${n.database}/documents/${e.path.canonicalString()}`}}function io(n){return!!n&&"integerValue"in n}function Oo(n){return!!n&&"arrayValue"in n}function il(n){return!!n&&"nullValue"in n}function ol(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function sr(n){return!!n&&"mapValue"in n}function f_(n){return(n?.mapValue?.fields||{})[lh]?.stringValue===uh}function es(n){if(n.geoPointValue)return{geoPointValue:{...n.geoPointValue}};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:{...n.timestampValue}};if(n.mapValue){const e={mapValue:{fields:{}}};return Ft(n.mapValue.fields,((t,s)=>e.mapValue.fields[t]=es(s))),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=es(n.arrayValue.values[t]);return e}return{...n}}function m_(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue===d_}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ke{constructor(e){this.value=e}static empty(){return new ke({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let s=0;s<e.length-1;++s)if(t=(t.mapValue.fields||{})[e.get(s)],!sr(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=es(t)}setAll(e){let t=ye.emptyPath(),s={},r=[];e.forEach(((a,c)=>{if(!t.isImmediateParentOf(c)){const u=this.getFieldsMap(t);this.applyChanges(u,s,r),s={},r=[],t=c.popLast()}a?s[c.lastSegment()]=es(a):r.push(c.lastSegment())}));const i=this.getFieldsMap(t);this.applyChanges(i,s,r)}delete(e){const t=this.field(e.popLast());sr(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Ze(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let s=0;s<e.length;++s){let r=t.mapValue.fields[e.get(s)];sr(r)&&r.mapValue.fields||(r={mapValue:{fields:{}}},t.mapValue.fields[e.get(s)]=r),t=r}return t.mapValue.fields}applyChanges(e,t,s){Ft(t,((r,i)=>e[r]=i));for(const r of s)delete e[r]}clone(){return new ke(es(this.value))}}function hh(n){const e=[];return Ft(n.fields,((t,s)=>{const r=new ye([t]);if(sr(s)){const i=hh(s.mapValue).fields;if(i.length===0)e.push(r);else for(const a of i)e.push(r.child(a))}else e.push(r)})),new Me(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ae{constructor(e,t,s,r,i,a,c){this.key=e,this.documentType=t,this.version=s,this.readTime=r,this.createTime=i,this.data=a,this.documentState=c}static newInvalidDocument(e){return new Ae(e,0,F.min(),F.min(),F.min(),ke.empty(),0)}static newFoundDocument(e,t,s,r){return new Ae(e,1,t,F.min(),s,r,0)}static newNoDocument(e,t){return new Ae(e,2,t,F.min(),F.min(),ke.empty(),0)}static newUnknownDocument(e,t){return new Ae(e,3,t,F.min(),F.min(),ke.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(F.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=ke.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=ke.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=F.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof Ae&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new Ae(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yr{constructor(e,t){this.position=e,this.inclusive=t}}function al(n,e,t){let s=0;for(let r=0;r<n.position.length;r++){const i=e[r],a=n.position[r];if(i.field.isKeyField()?s=O.comparator(O.fromName(a.referenceValue),t.key):s=vn(a,t.data.field(i.field)),i.dir==="desc"&&(s*=-1),s!==0)break}return s}function cl(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!Ze(n.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Er{constructor(e,t="asc"){this.field=e,this.dir=t}}function p_(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dh{}class ue extends dh{constructor(e,t,s){super(),this.field=e,this.op=t,this.value=s}static create(e,t,s){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,s):new __(e,t,s):t==="array-contains"?new I_(e,s):t==="in"?new v_(e,s):t==="not-in"?new T_(e,s):t==="array-contains-any"?new w_(e,s):new ue(e,t,s)}static createKeyFieldInFilter(e,t,s){return t==="in"?new y_(e,s):new E_(e,s)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&t.nullValue===void 0&&this.matchesComparison(vn(t,this.value)):t!==null&&Ot(this.value)===Ot(t)&&this.matchesComparison(vn(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return x(47266,{operator:this.op})}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class $e extends dh{constructor(e,t){super(),this.filters=e,this.op=t,this.Pe=null}static create(e,t){return new $e(e,t)}matches(e){return fh(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.Pe!==null||(this.Pe=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.Pe}getFilters(){return Object.assign([],this.filters)}}function fh(n){return n.op==="and"}function mh(n){return g_(n)&&fh(n)}function g_(n){for(const e of n.filters)if(e instanceof $e)return!1;return!0}function oo(n){if(n instanceof ue)return n.field.canonicalString()+n.op.toString()+Tn(n.value);if(mh(n))return n.filters.map((e=>oo(e))).join(",");{const e=n.filters.map((t=>oo(t))).join(",");return`${n.op}(${e})`}}function ph(n,e){return n instanceof ue?(function(s,r){return r instanceof ue&&s.op===r.op&&s.field.isEqual(r.field)&&Ze(s.value,r.value)})(n,e):n instanceof $e?(function(s,r){return r instanceof $e&&s.op===r.op&&s.filters.length===r.filters.length?s.filters.reduce(((i,a,c)=>i&&ph(a,r.filters[c])),!0):!1})(n,e):void x(19439)}function gh(n){return n instanceof ue?(function(t){return`${t.field.canonicalString()} ${t.op} ${Tn(t.value)}`})(n):n instanceof $e?(function(t){return t.op.toString()+" {"+t.getFilters().map(gh).join(" ,")+"}"})(n):"Filter"}class __ extends ue{constructor(e,t,s){super(e,t,s),this.key=O.fromName(s.referenceValue)}matches(e){const t=O.comparator(e.key,this.key);return this.matchesComparison(t)}}class y_ extends ue{constructor(e,t){super(e,"in",t),this.keys=_h("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class E_ extends ue{constructor(e,t){super(e,"not-in",t),this.keys=_h("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function _h(n,e){return(e.arrayValue?.values||[]).map((t=>O.fromName(t.referenceValue)))}class I_ extends ue{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Oo(t)&&ls(t.arrayValue,this.value)}}class v_ extends ue{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&ls(this.value.arrayValue,t)}}class T_ extends ue{constructor(e,t){super(e,"not-in",t)}matches(e){if(ls(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&t.nullValue===void 0&&!ls(this.value.arrayValue,t)}}class w_ extends ue{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Oo(t)||!t.arrayValue.values)&&t.arrayValue.values.some((s=>ls(this.value.arrayValue,s)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class A_{constructor(e,t=null,s=[],r=[],i=null,a=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=s,this.filters=r,this.limit=i,this.startAt=a,this.endAt=c,this.Te=null}}function ll(n,e=null,t=[],s=[],r=null,i=null,a=null){return new A_(n,e,t,s,r,i,a)}function xo(n){const e=B(n);if(e.Te===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((s=>oo(s))).join(","),t+="|ob:",t+=e.orderBy.map((s=>(function(i){return i.field.canonicalString()+i.dir})(s))).join(","),$r(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((s=>Tn(s))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((s=>Tn(s))).join(",")),e.Te=t}return e.Te}function Uo(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!p_(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!ph(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!cl(n.startAt,e.startAt)&&cl(n.endAt,e.endAt)}function ao(n){return O.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Is{constructor(e,t=null,s=[],r=[],i=null,a="F",c=null,u=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=s,this.filters=r,this.limit=i,this.limitType=a,this.startAt=c,this.endAt=u,this.Ie=null,this.Ee=null,this.de=null,this.startAt,this.endAt}}function b_(n,e,t,s,r,i,a,c){return new Is(n,e,t,s,r,i,a,c)}function Hr(n){return new Is(n)}function ul(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function yh(n){return n.collectionGroup!==null}function ts(n){const e=B(n);if(e.Ie===null){e.Ie=[];const t=new Set;for(const i of e.explicitOrderBy)e.Ie.push(i),t.add(i.field.canonicalString());const s=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(a){let c=new me(ye.comparator);return a.filters.forEach((u=>{u.getFlattenedFilters().forEach((d=>{d.isInequality()&&(c=c.add(d.field))}))})),c})(e).forEach((i=>{t.has(i.canonicalString())||i.isKeyField()||e.Ie.push(new Er(i,s))})),t.has(ye.keyField().canonicalString())||e.Ie.push(new Er(ye.keyField(),s))}return e.Ie}function Qe(n){const e=B(n);return e.Ee||(e.Ee=S_(e,ts(n))),e.Ee}function S_(n,e){if(n.limitType==="F")return ll(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map((r=>{const i=r.dir==="desc"?"asc":"desc";return new Er(r.field,i)}));const t=n.endAt?new yr(n.endAt.position,n.endAt.inclusive):null,s=n.startAt?new yr(n.startAt.position,n.startAt.inclusive):null;return ll(n.path,n.collectionGroup,e,n.filters,n.limit,t,s)}}function co(n,e){const t=n.filters.concat([e]);return new Is(n.path,n.collectionGroup,n.explicitOrderBy.slice(),t,n.limit,n.limitType,n.startAt,n.endAt)}function lo(n,e,t){return new Is(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function zr(n,e){return Uo(Qe(n),Qe(e))&&n.limitType===e.limitType}function Eh(n){return`${xo(Qe(n))}|lt:${n.limitType}`}function hn(n){return`Query(target=${(function(t){let s=t.path.canonicalString();return t.collectionGroup!==null&&(s+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(s+=`, filters: [${t.filters.map((r=>gh(r))).join(", ")}]`),$r(t.limit)||(s+=", limit: "+t.limit),t.orderBy.length>0&&(s+=`, orderBy: [${t.orderBy.map((r=>(function(a){return`${a.field.canonicalString()} (${a.dir})`})(r))).join(", ")}]`),t.startAt&&(s+=", startAt: ",s+=t.startAt.inclusive?"b:":"a:",s+=t.startAt.position.map((r=>Tn(r))).join(",")),t.endAt&&(s+=", endAt: ",s+=t.endAt.inclusive?"a:":"b:",s+=t.endAt.position.map((r=>Tn(r))).join(",")),`Target(${s})`})(Qe(n))}; limitType=${n.limitType})`}function Gr(n,e){return e.isFoundDocument()&&(function(s,r){const i=r.key.path;return s.collectionGroup!==null?r.key.hasCollectionId(s.collectionGroup)&&s.path.isPrefixOf(i):O.isDocumentKey(s.path)?s.path.isEqual(i):s.path.isImmediateParentOf(i)})(n,e)&&(function(s,r){for(const i of ts(s))if(!i.field.isKeyField()&&r.data.field(i.field)===null)return!1;return!0})(n,e)&&(function(s,r){for(const i of s.filters)if(!i.matches(r))return!1;return!0})(n,e)&&(function(s,r){return!(s.startAt&&!(function(a,c,u){const d=al(a,c,u);return a.inclusive?d<=0:d<0})(s.startAt,ts(s),r)||s.endAt&&!(function(a,c,u){const d=al(a,c,u);return a.inclusive?d>=0:d>0})(s.endAt,ts(s),r))})(n,e)}function R_(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function Ih(n){return(e,t)=>{let s=!1;for(const r of ts(n)){const i=C_(r,e,t);if(i!==0)return i;s=s||r.field.isKeyField()}return 0}}function C_(n,e,t){const s=n.field.isKeyField()?O.comparator(e.key,t.key):(function(i,a,c){const u=a.data.field(i),d=c.data.field(i);return u!==null&&d!==null?vn(u,d):x(42886)})(n.field,e,t);switch(n.dir){case"asc":return s;case"desc":return-1*s;default:return x(19790,{direction:n.dir})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sn{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),s=this.inner[t];if(s!==void 0){for(const[r,i]of s)if(this.equalsFn(r,e))return i}}has(e){return this.get(e)!==void 0}set(e,t){const s=this.mapKeyFn(e),r=this.inner[s];if(r===void 0)return this.inner[s]=[[e,t]],void this.innerSize++;for(let i=0;i<r.length;i++)if(this.equalsFn(r[i][0],e))return void(r[i]=[e,t]);r.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),s=this.inner[t];if(s===void 0)return!1;for(let r=0;r<s.length;r++)if(this.equalsFn(s[r][0],e))return s.length===1?delete this.inner[t]:s.splice(r,1),this.innerSize--,!0;return!1}forEach(e){Ft(this.inner,((t,s)=>{for(const[r,i]of s)e(r,i)}))}isEmpty(){return sh(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const P_=new ne(O.comparator);function ut(){return P_}const vh=new ne(O.comparator);function Qn(...n){let e=vh;for(const t of n)e=e.insert(t.key,t);return e}function Th(n){let e=vh;return n.forEach(((t,s)=>e=e.insert(t,s.overlayedDocument))),e}function Kt(){return ns()}function wh(){return ns()}function ns(){return new sn((n=>n.toString()),((n,e)=>n.isEqual(e)))}const k_=new ne(O.comparator),V_=new me(O.comparator);function W(...n){let e=V_;for(const t of n)e=e.add(t);return e}const N_=new me(G);function D_(){return N_}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fo(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:pr(e)?"-0":e}}function Ah(n){return{integerValue:""+n}}function L_(n,e){return a_(e)?Ah(e):Fo(n,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wr{constructor(){this._=void 0}}function M_(n,e,t){return n instanceof us?(function(r,i){const a={fields:{[oh]:{stringValue:ih},[ch]:{timestampValue:{seconds:r.seconds,nanos:r.nanoseconds}}}};return i&&Mo(i)&&(i=qr(i)),i&&(a.fields[ah]=i),{mapValue:a}})(t,e):n instanceof hs?Sh(n,e):n instanceof ds?Rh(n,e):(function(r,i){const a=bh(r,i),c=hl(a)+hl(r.Ae);return io(a)&&io(r.Ae)?Ah(c):Fo(r.serializer,c)})(n,e)}function O_(n,e,t){return n instanceof hs?Sh(n,e):n instanceof ds?Rh(n,e):t}function bh(n,e){return n instanceof Ir?(function(s){return io(s)||(function(i){return!!i&&"doubleValue"in i})(s)})(e)?e:{integerValue:0}:null}class us extends Wr{}class hs extends Wr{constructor(e){super(),this.elements=e}}function Sh(n,e){const t=Ch(e);for(const s of n.elements)t.some((r=>Ze(r,s)))||t.push(s);return{arrayValue:{values:t}}}class ds extends Wr{constructor(e){super(),this.elements=e}}function Rh(n,e){let t=Ch(e);for(const s of n.elements)t=t.filter((r=>!Ze(r,s)));return{arrayValue:{values:t}}}class Ir extends Wr{constructor(e,t){super(),this.serializer=e,this.Ae=t}}function hl(n){return oe(n.integerValue||n.doubleValue)}function Ch(n){return Oo(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class x_{constructor(e,t){this.field=e,this.transform=t}}function U_(n,e){return n.field.isEqual(e.field)&&(function(s,r){return s instanceof hs&&r instanceof hs||s instanceof ds&&r instanceof ds?In(s.elements,r.elements,Ze):s instanceof Ir&&r instanceof Ir?Ze(s.Ae,r.Ae):s instanceof us&&r instanceof us})(n.transform,e.transform)}class F_{constructor(e,t){this.version=e,this.transformResults=t}}class Ne{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new Ne}static exists(e){return new Ne(void 0,e)}static updateTime(e){return new Ne(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function rr(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class Kr{}function Ph(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new Qr(n.key,Ne.none()):new vs(n.key,n.data,Ne.none());{const t=n.data,s=ke.empty();let r=new me(ye.comparator);for(let i of e.fields)if(!r.has(i)){let a=t.field(i);a===null&&i.length>1&&(i=i.popLast(),a=t.field(i)),a===null?s.delete(i):s.set(i,a),r=r.add(i)}return new Bt(n.key,s,new Me(r.toArray()),Ne.none())}}function B_(n,e,t){n instanceof vs?(function(r,i,a){const c=r.value.clone(),u=fl(r.fieldTransforms,i,a.transformResults);c.setAll(u),i.convertToFoundDocument(a.version,c).setHasCommittedMutations()})(n,e,t):n instanceof Bt?(function(r,i,a){if(!rr(r.precondition,i))return void i.convertToUnknownDocument(a.version);const c=fl(r.fieldTransforms,i,a.transformResults),u=i.data;u.setAll(kh(r)),u.setAll(c),i.convertToFoundDocument(a.version,u).setHasCommittedMutations()})(n,e,t):(function(r,i,a){i.convertToNoDocument(a.version).setHasCommittedMutations()})(0,e,t)}function ss(n,e,t,s){return n instanceof vs?(function(i,a,c,u){if(!rr(i.precondition,a))return c;const d=i.value.clone(),f=ml(i.fieldTransforms,u,a);return d.setAll(f),a.convertToFoundDocument(a.version,d).setHasLocalMutations(),null})(n,e,t,s):n instanceof Bt?(function(i,a,c,u){if(!rr(i.precondition,a))return c;const d=ml(i.fieldTransforms,u,a),f=a.data;return f.setAll(kh(i)),f.setAll(d),a.convertToFoundDocument(a.version,f).setHasLocalMutations(),c===null?null:c.unionWith(i.fieldMask.fields).unionWith(i.fieldTransforms.map((p=>p.field)))})(n,e,t,s):(function(i,a,c){return rr(i.precondition,a)?(a.convertToNoDocument(a.version).setHasLocalMutations(),null):c})(n,e,t)}function j_(n,e){let t=null;for(const s of n.fieldTransforms){const r=e.data.field(s.field),i=bh(s.transform,r||null);i!=null&&(t===null&&(t=ke.empty()),t.set(s.field,i))}return t||null}function dl(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!(function(s,r){return s===void 0&&r===void 0||!(!s||!r)&&In(s,r,((i,a)=>U_(i,a)))})(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class vs extends Kr{constructor(e,t,s,r=[]){super(),this.key=e,this.value=t,this.precondition=s,this.fieldTransforms=r,this.type=0}getFieldMask(){return null}}class Bt extends Kr{constructor(e,t,s,r,i=[]){super(),this.key=e,this.data=t,this.fieldMask=s,this.precondition=r,this.fieldTransforms=i,this.type=1}getFieldMask(){return this.fieldMask}}function kh(n){const e=new Map;return n.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const s=n.data.field(t);e.set(t,s)}})),e}function fl(n,e,t){const s=new Map;J(n.length===t.length,32656,{Re:t.length,Ve:n.length});for(let r=0;r<t.length;r++){const i=n[r],a=i.transform,c=e.data.field(i.field);s.set(i.field,O_(a,c,t[r]))}return s}function ml(n,e,t){const s=new Map;for(const r of n){const i=r.transform,a=t.data.field(r.field);s.set(r.field,M_(i,a,e))}return s}class Qr extends Kr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class $_ extends Kr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q_{constructor(e,t,s,r){this.batchId=e,this.localWriteTime=t,this.baseMutations=s,this.mutations=r}applyToRemoteDocument(e,t){const s=t.mutationResults;for(let r=0;r<this.mutations.length;r++){const i=this.mutations[r];i.key.isEqual(e.key)&&B_(i,e,s[r])}}applyToLocalView(e,t){for(const s of this.baseMutations)s.key.isEqual(e.key)&&(t=ss(s,e,t,this.localWriteTime));for(const s of this.mutations)s.key.isEqual(e.key)&&(t=ss(s,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const s=wh();return this.mutations.forEach((r=>{const i=e.get(r.key),a=i.overlayedDocument;let c=this.applyToLocalView(a,i.mutatedFields);c=t.has(r.key)?null:c;const u=Ph(a,c);u!==null&&s.set(r.key,u),a.isValidDocument()||a.convertToNoDocument(F.min())})),s}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),W())}isEqual(e){return this.batchId===e.batchId&&In(this.mutations,e.mutations,((t,s)=>dl(t,s)))&&In(this.baseMutations,e.baseMutations,((t,s)=>dl(t,s)))}}class Bo{constructor(e,t,s,r){this.batch=e,this.commitVersion=t,this.mutationResults=s,this.docVersions=r}static from(e,t,s){J(e.mutations.length===s.length,58842,{me:e.mutations.length,fe:s.length});let r=(function(){return k_})();const i=e.mutations;for(let a=0;a<i.length;a++)r=r.insert(i[a].key,s[a].version);return new Bo(e,t,s,r)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H_{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class z_{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ce,Q;function G_(n){switch(n){case R.OK:return x(64938);case R.CANCELLED:case R.UNKNOWN:case R.DEADLINE_EXCEEDED:case R.RESOURCE_EXHAUSTED:case R.INTERNAL:case R.UNAVAILABLE:case R.UNAUTHENTICATED:return!1;case R.INVALID_ARGUMENT:case R.NOT_FOUND:case R.ALREADY_EXISTS:case R.PERMISSION_DENIED:case R.FAILED_PRECONDITION:case R.ABORTED:case R.OUT_OF_RANGE:case R.UNIMPLEMENTED:case R.DATA_LOSS:return!0;default:return x(15467,{code:n})}}function Vh(n){if(n===void 0)return lt("GRPC error has no .code"),R.UNKNOWN;switch(n){case ce.OK:return R.OK;case ce.CANCELLED:return R.CANCELLED;case ce.UNKNOWN:return R.UNKNOWN;case ce.DEADLINE_EXCEEDED:return R.DEADLINE_EXCEEDED;case ce.RESOURCE_EXHAUSTED:return R.RESOURCE_EXHAUSTED;case ce.INTERNAL:return R.INTERNAL;case ce.UNAVAILABLE:return R.UNAVAILABLE;case ce.UNAUTHENTICATED:return R.UNAUTHENTICATED;case ce.INVALID_ARGUMENT:return R.INVALID_ARGUMENT;case ce.NOT_FOUND:return R.NOT_FOUND;case ce.ALREADY_EXISTS:return R.ALREADY_EXISTS;case ce.PERMISSION_DENIED:return R.PERMISSION_DENIED;case ce.FAILED_PRECONDITION:return R.FAILED_PRECONDITION;case ce.ABORTED:return R.ABORTED;case ce.OUT_OF_RANGE:return R.OUT_OF_RANGE;case ce.UNIMPLEMENTED:return R.UNIMPLEMENTED;case ce.DATA_LOSS:return R.DATA_LOSS;default:return x(39323,{code:n})}}(Q=ce||(ce={}))[Q.OK=0]="OK",Q[Q.CANCELLED=1]="CANCELLED",Q[Q.UNKNOWN=2]="UNKNOWN",Q[Q.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",Q[Q.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",Q[Q.NOT_FOUND=5]="NOT_FOUND",Q[Q.ALREADY_EXISTS=6]="ALREADY_EXISTS",Q[Q.PERMISSION_DENIED=7]="PERMISSION_DENIED",Q[Q.UNAUTHENTICATED=16]="UNAUTHENTICATED",Q[Q.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",Q[Q.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",Q[Q.ABORTED=10]="ABORTED",Q[Q.OUT_OF_RANGE=11]="OUT_OF_RANGE",Q[Q.UNIMPLEMENTED=12]="UNIMPLEMENTED",Q[Q.INTERNAL=13]="INTERNAL",Q[Q.UNAVAILABLE=14]="UNAVAILABLE",Q[Q.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function W_(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const K_=new Pt([4294967295,4294967295],0);function pl(n){const e=W_().encode(n),t=new Gu;return t.update(e),new Uint8Array(t.digest())}function gl(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),s=e.getUint32(4,!0),r=e.getUint32(8,!0),i=e.getUint32(12,!0);return[new Pt([t,s],0),new Pt([r,i],0)]}class jo{constructor(e,t,s){if(this.bitmap=e,this.padding=t,this.hashCount=s,t<0||t>=8)throw new Jn(`Invalid padding: ${t}`);if(s<0)throw new Jn(`Invalid hash count: ${s}`);if(e.length>0&&this.hashCount===0)throw new Jn(`Invalid hash count: ${s}`);if(e.length===0&&t!==0)throw new Jn(`Invalid padding when bitmap length is 0: ${t}`);this.ge=8*e.length-t,this.pe=Pt.fromNumber(this.ge)}ye(e,t,s){let r=e.add(t.multiply(Pt.fromNumber(s)));return r.compare(K_)===1&&(r=new Pt([r.getBits(0),r.getBits(1)],0)),r.modulo(this.pe).toNumber()}we(e){return!!(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(this.ge===0)return!1;const t=pl(e),[s,r]=gl(t);for(let i=0;i<this.hashCount;i++){const a=this.ye(s,r,i);if(!this.we(a))return!1}return!0}static create(e,t,s){const r=e%8==0?0:8-e%8,i=new Uint8Array(Math.ceil(e/8)),a=new jo(i,r,t);return s.forEach((c=>a.insert(c))),a}insert(e){if(this.ge===0)return;const t=pl(e),[s,r]=gl(t);for(let i=0;i<this.hashCount;i++){const a=this.ye(s,r,i);this.Se(a)}}Se(e){const t=Math.floor(e/8),s=e%8;this.bitmap[t]|=1<<s}}class Jn extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jr{constructor(e,t,s,r,i){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=s,this.documentUpdates=r,this.resolvedLimboDocuments=i}static createSynthesizedRemoteEventForCurrentChange(e,t,s){const r=new Map;return r.set(e,Ts.createSynthesizedTargetChangeForCurrentChange(e,t,s)),new Jr(F.min(),r,new ne(G),ut(),W())}}class Ts{constructor(e,t,s,r,i){this.resumeToken=e,this.current=t,this.addedDocuments=s,this.modifiedDocuments=r,this.removedDocuments=i}static createSynthesizedTargetChangeForCurrentChange(e,t,s){return new Ts(s,t,W(),W(),W())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ir{constructor(e,t,s,r){this.be=e,this.removedTargetIds=t,this.key=s,this.De=r}}class Nh{constructor(e,t){this.targetId=e,this.Ce=t}}class Dh{constructor(e,t,s=Ie.EMPTY_BYTE_STRING,r=null){this.state=e,this.targetIds=t,this.resumeToken=s,this.cause=r}}class _l{constructor(){this.ve=0,this.Fe=yl(),this.Me=Ie.EMPTY_BYTE_STRING,this.xe=!1,this.Oe=!0}get current(){return this.xe}get resumeToken(){return this.Me}get Ne(){return this.ve!==0}get Be(){return this.Oe}Le(e){e.approximateByteSize()>0&&(this.Oe=!0,this.Me=e)}ke(){let e=W(),t=W(),s=W();return this.Fe.forEach(((r,i)=>{switch(i){case 0:e=e.add(r);break;case 2:t=t.add(r);break;case 1:s=s.add(r);break;default:x(38017,{changeType:i})}})),new Ts(this.Me,this.xe,e,t,s)}qe(){this.Oe=!1,this.Fe=yl()}Qe(e,t){this.Oe=!0,this.Fe=this.Fe.insert(e,t)}$e(e){this.Oe=!0,this.Fe=this.Fe.remove(e)}Ue(){this.ve+=1}Ke(){this.ve-=1,J(this.ve>=0,3241,{ve:this.ve})}We(){this.Oe=!0,this.xe=!0}}class Q_{constructor(e){this.Ge=e,this.ze=new Map,this.je=ut(),this.Je=Ks(),this.He=Ks(),this.Ye=new ne(G)}Ze(e){for(const t of e.be)e.De&&e.De.isFoundDocument()?this.Xe(t,e.De):this.et(t,e.key,e.De);for(const t of e.removedTargetIds)this.et(t,e.key,e.De)}tt(e){this.forEachTarget(e,(t=>{const s=this.nt(t);switch(e.state){case 0:this.rt(t)&&s.Le(e.resumeToken);break;case 1:s.Ke(),s.Ne||s.qe(),s.Le(e.resumeToken);break;case 2:s.Ke(),s.Ne||this.removeTarget(t);break;case 3:this.rt(t)&&(s.We(),s.Le(e.resumeToken));break;case 4:this.rt(t)&&(this.it(t),s.Le(e.resumeToken));break;default:x(56790,{state:e.state})}}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.ze.forEach(((s,r)=>{this.rt(r)&&t(r)}))}st(e){const t=e.targetId,s=e.Ce.count,r=this.ot(t);if(r){const i=r.target;if(ao(i))if(s===0){const a=new O(i.path);this.et(t,a,Ae.newNoDocument(a,F.min()))}else J(s===1,20013,{expectedCount:s});else{const a=this._t(t);if(a!==s){const c=this.ut(e),u=c?this.ct(c,e,a):1;if(u!==0){this.it(t);const d=u===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Ye=this.Ye.insert(t,d)}}}}}ut(e){const t=e.Ce.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:s="",padding:r=0},hashCount:i=0}=t;let a,c;try{a=Mt(s).toUint8Array()}catch(u){if(u instanceof rh)return En("Decoding the base64 bloom filter in existence filter failed ("+u.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw u}try{c=new jo(a,r,i)}catch(u){return En(u instanceof Jn?"BloomFilter error: ":"Applying bloom filter failed: ",u),null}return c.ge===0?null:c}ct(e,t,s){return t.Ce.count===s-this.Pt(e,t.targetId)?0:2}Pt(e,t){const s=this.Ge.getRemoteKeysForTarget(t);let r=0;return s.forEach((i=>{const a=this.Ge.ht(),c=`projects/${a.projectId}/databases/${a.database}/documents/${i.path.canonicalString()}`;e.mightContain(c)||(this.et(t,i,null),r++)})),r}Tt(e){const t=new Map;this.ze.forEach(((i,a)=>{const c=this.ot(a);if(c){if(i.current&&ao(c.target)){const u=new O(c.target.path);this.It(u).has(a)||this.Et(a,u)||this.et(a,u,Ae.newNoDocument(u,e))}i.Be&&(t.set(a,i.ke()),i.qe())}}));let s=W();this.He.forEach(((i,a)=>{let c=!0;a.forEachWhile((u=>{const d=this.ot(u);return!d||d.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(s=s.add(i))})),this.je.forEach(((i,a)=>a.setReadTime(e)));const r=new Jr(e,t,this.Ye,this.je,s);return this.je=ut(),this.Je=Ks(),this.He=Ks(),this.Ye=new ne(G),r}Xe(e,t){if(!this.rt(e))return;const s=this.Et(e,t.key)?2:0;this.nt(e).Qe(t.key,s),this.je=this.je.insert(t.key,t),this.Je=this.Je.insert(t.key,this.It(t.key).add(e)),this.He=this.He.insert(t.key,this.dt(t.key).add(e))}et(e,t,s){if(!this.rt(e))return;const r=this.nt(e);this.Et(e,t)?r.Qe(t,1):r.$e(t),this.He=this.He.insert(t,this.dt(t).delete(e)),this.He=this.He.insert(t,this.dt(t).add(e)),s&&(this.je=this.je.insert(t,s))}removeTarget(e){this.ze.delete(e)}_t(e){const t=this.nt(e).ke();return this.Ge.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}Ue(e){this.nt(e).Ue()}nt(e){let t=this.ze.get(e);return t||(t=new _l,this.ze.set(e,t)),t}dt(e){let t=this.He.get(e);return t||(t=new me(G),this.He=this.He.insert(e,t)),t}It(e){let t=this.Je.get(e);return t||(t=new me(G),this.Je=this.Je.insert(e,t)),t}rt(e){const t=this.ot(e)!==null;return t||L("WatchChangeAggregator","Detected inactive target",e),t}ot(e){const t=this.ze.get(e);return t&&t.Ne?null:this.Ge.At(e)}it(e){this.ze.set(e,new _l),this.Ge.getRemoteKeysForTarget(e).forEach((t=>{this.et(e,t,null)}))}Et(e,t){return this.Ge.getRemoteKeysForTarget(e).has(t)}}function Ks(){return new ne(O.comparator)}function yl(){return new ne(O.comparator)}const J_={asc:"ASCENDING",desc:"DESCENDING"},X_={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},Y_={and:"AND",or:"OR"};class Z_{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function uo(n,e){return n.useProto3Json||$r(e)?e:{value:e}}function vr(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function Lh(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function ey(n,e){return vr(n,e.toTimestamp())}function Je(n){return J(!!n,49232),F.fromTimestamp((function(t){const s=Lt(t);return new te(s.seconds,s.nanos)})(n))}function $o(n,e){return ho(n,e).canonicalString()}function ho(n,e){const t=(function(r){return new Z(["projects",r.projectId,"databases",r.database])})(n).child("documents");return e===void 0?t:t.child(e)}function Mh(n){const e=Z.fromString(n);return J(Bh(e),10190,{key:e.toString()}),e}function fo(n,e){return $o(n.databaseId,e.path)}function $i(n,e){const t=Mh(e);if(t.get(1)!==n.databaseId.projectId)throw new N(R.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new N(R.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new O(xh(t))}function Oh(n,e){return $o(n.databaseId,e)}function ty(n){const e=Mh(n);return e.length===4?Z.emptyPath():xh(e)}function mo(n){return new Z(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function xh(n){return J(n.length>4&&n.get(4)==="documents",29091,{key:n.toString()}),n.popFirst(5)}function El(n,e,t){return{name:fo(n,e),fields:t.value.mapValue.fields}}function ny(n,e){let t;if("targetChange"in e){e.targetChange;const s=(function(d){return d==="NO_CHANGE"?0:d==="ADD"?1:d==="REMOVE"?2:d==="CURRENT"?3:d==="RESET"?4:x(39313,{state:d})})(e.targetChange.targetChangeType||"NO_CHANGE"),r=e.targetChange.targetIds||[],i=(function(d,f){return d.useProto3Json?(J(f===void 0||typeof f=="string",58123),Ie.fromBase64String(f||"")):(J(f===void 0||f instanceof Buffer||f instanceof Uint8Array,16193),Ie.fromUint8Array(f||new Uint8Array))})(n,e.targetChange.resumeToken),a=e.targetChange.cause,c=a&&(function(d){const f=d.code===void 0?R.UNKNOWN:Vh(d.code);return new N(f,d.message||"")})(a);t=new Dh(s,r,i,c||null)}else if("documentChange"in e){e.documentChange;const s=e.documentChange;s.document,s.document.name,s.document.updateTime;const r=$i(n,s.document.name),i=Je(s.document.updateTime),a=s.document.createTime?Je(s.document.createTime):F.min(),c=new ke({mapValue:{fields:s.document.fields}}),u=Ae.newFoundDocument(r,i,a,c),d=s.targetIds||[],f=s.removedTargetIds||[];t=new ir(d,f,u.key,u)}else if("documentDelete"in e){e.documentDelete;const s=e.documentDelete;s.document;const r=$i(n,s.document),i=s.readTime?Je(s.readTime):F.min(),a=Ae.newNoDocument(r,i),c=s.removedTargetIds||[];t=new ir([],c,a.key,a)}else if("documentRemove"in e){e.documentRemove;const s=e.documentRemove;s.document;const r=$i(n,s.document),i=s.removedTargetIds||[];t=new ir([],i,r,null)}else{if(!("filter"in e))return x(11601,{Rt:e});{e.filter;const s=e.filter;s.targetId;const{count:r=0,unchangedNames:i}=s,a=new z_(r,i),c=s.targetId;t=new Nh(c,a)}}return t}function sy(n,e){let t;if(e instanceof vs)t={update:El(n,e.key,e.value)};else if(e instanceof Qr)t={delete:fo(n,e.key)};else if(e instanceof Bt)t={update:El(n,e.key,e.data),updateMask:dy(e.fieldMask)};else{if(!(e instanceof $_))return x(16599,{Vt:e.type});t={verify:fo(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((s=>(function(i,a){const c=a.transform;if(c instanceof us)return{fieldPath:a.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof hs)return{fieldPath:a.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof ds)return{fieldPath:a.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof Ir)return{fieldPath:a.field.canonicalString(),increment:c.Ae};throw x(20930,{transform:a.transform})})(0,s)))),e.precondition.isNone||(t.currentDocument=(function(r,i){return i.updateTime!==void 0?{updateTime:ey(r,i.updateTime)}:i.exists!==void 0?{exists:i.exists}:x(27497)})(n,e.precondition)),t}function ry(n,e){return n&&n.length>0?(J(e!==void 0,14353),n.map((t=>(function(r,i){let a=r.updateTime?Je(r.updateTime):Je(i);return a.isEqual(F.min())&&(a=Je(i)),new F_(a,r.transformResults||[])})(t,e)))):[]}function iy(n,e){return{documents:[Oh(n,e.path)]}}function oy(n,e){const t={structuredQuery:{}},s=e.path;let r;e.collectionGroup!==null?(r=s,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(r=s.popLast(),t.structuredQuery.from=[{collectionId:s.lastSegment()}]),t.parent=Oh(n,r);const i=(function(d){if(d.length!==0)return Fh($e.create(d,"and"))})(e.filters);i&&(t.structuredQuery.where=i);const a=(function(d){if(d.length!==0)return d.map((f=>(function(y){return{field:dn(y.field),direction:ly(y.dir)}})(f)))})(e.orderBy);a&&(t.structuredQuery.orderBy=a);const c=uo(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=(function(d){return{before:d.inclusive,values:d.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(d){return{before:!d.inclusive,values:d.position}})(e.endAt)),{ft:t,parent:r}}function ay(n){let e=ty(n.parent);const t=n.structuredQuery,s=t.from?t.from.length:0;let r=null;if(s>0){J(s===1,65062);const f=t.from[0];f.allDescendants?r=f.collectionId:e=e.child(f.collectionId)}let i=[];t.where&&(i=(function(p){const y=Uh(p);return y instanceof $e&&mh(y)?y.getFilters():[y]})(t.where));let a=[];t.orderBy&&(a=(function(p){return p.map((y=>(function(P){return new Er(fn(P.field),(function(k){switch(k){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(P.direction))})(y)))})(t.orderBy));let c=null;t.limit&&(c=(function(p){let y;return y=typeof p=="object"?p.value:p,$r(y)?null:y})(t.limit));let u=null;t.startAt&&(u=(function(p){const y=!!p.before,S=p.values||[];return new yr(S,y)})(t.startAt));let d=null;return t.endAt&&(d=(function(p){const y=!p.before,S=p.values||[];return new yr(S,y)})(t.endAt)),b_(e,r,a,i,c,"F",u,d)}function cy(n,e){const t=(function(r){switch(r){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return x(28987,{purpose:r})}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Uh(n){return n.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const s=fn(t.unaryFilter.field);return ue.create(s,"==",{doubleValue:NaN});case"IS_NULL":const r=fn(t.unaryFilter.field);return ue.create(r,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const i=fn(t.unaryFilter.field);return ue.create(i,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const a=fn(t.unaryFilter.field);return ue.create(a,"!=",{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":return x(61313);default:return x(60726)}})(n):n.fieldFilter!==void 0?(function(t){return ue.create(fn(t.fieldFilter.field),(function(r){switch(r){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";case"OPERATOR_UNSPECIFIED":return x(58110);default:return x(50506)}})(t.fieldFilter.op),t.fieldFilter.value)})(n):n.compositeFilter!==void 0?(function(t){return $e.create(t.compositeFilter.filters.map((s=>Uh(s))),(function(r){switch(r){case"AND":return"and";case"OR":return"or";default:return x(1026)}})(t.compositeFilter.op))})(n):x(30097,{filter:n})}function ly(n){return J_[n]}function uy(n){return X_[n]}function hy(n){return Y_[n]}function dn(n){return{fieldPath:n.canonicalString()}}function fn(n){return ye.fromServerFormat(n.fieldPath)}function Fh(n){return n instanceof ue?(function(t){if(t.op==="=="){if(ol(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NAN"}};if(il(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(ol(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NAN"}};if(il(t.value))return{unaryFilter:{field:dn(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:dn(t.field),op:uy(t.op),value:t.value}}})(n):n instanceof $e?(function(t){const s=t.getFilters().map((r=>Fh(r)));return s.length===1?s[0]:{compositeFilter:{op:hy(t.op),filters:s}}})(n):x(54877,{filter:n})}function dy(n){const e=[];return n.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function Bh(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class At{constructor(e,t,s,r,i=F.min(),a=F.min(),c=Ie.EMPTY_BYTE_STRING,u=null){this.target=e,this.targetId=t,this.purpose=s,this.sequenceNumber=r,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=a,this.resumeToken=c,this.expectedCount=u}withSequenceNumber(e){return new At(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new At(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new At(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new At(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fy{constructor(e){this.yt=e}}function my(n){const e=ay({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?lo(e,e.limit,"L"):e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class py{constructor(){this.Cn=new gy}addToCollectionParentIndex(e,t){return this.Cn.add(t),C.resolve()}getCollectionParents(e,t){return C.resolve(this.Cn.getEntries(t))}addFieldIndex(e,t){return C.resolve()}deleteFieldIndex(e,t){return C.resolve()}deleteAllFieldIndexes(e){return C.resolve()}createTargetIndexes(e,t){return C.resolve()}getDocumentsMatchingTarget(e,t){return C.resolve(null)}getIndexType(e,t){return C.resolve(0)}getFieldIndexes(e,t){return C.resolve([])}getNextCollectionGroupToUpdate(e){return C.resolve(null)}getMinOffset(e,t){return C.resolve(Dt.min())}getMinOffsetFromCollectionGroup(e,t){return C.resolve(Dt.min())}updateCollectionGroup(e,t,s){return C.resolve()}updateIndexEntries(e,t){return C.resolve()}}class gy{constructor(){this.index={}}add(e){const t=e.lastSegment(),s=e.popLast(),r=this.index[t]||new me(Z.comparator),i=!r.has(s);return this.index[t]=r.add(s),i}has(e){const t=e.lastSegment(),s=e.popLast(),r=this.index[t];return r&&r.has(s)}getEntries(e){return(this.index[e]||new me(Z.comparator)).toArray()}}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Il={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},jh=41943040;class Pe{static withCacheSize(e){return new Pe(e,Pe.DEFAULT_COLLECTION_PERCENTILE,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}constructor(e,t,s){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Pe.DEFAULT_COLLECTION_PERCENTILE=10,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Pe.DEFAULT=new Pe(jh,Pe.DEFAULT_COLLECTION_PERCENTILE,Pe.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Pe.DISABLED=new Pe(-1,0,0);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wn{constructor(e){this.ar=e}next(){return this.ar+=2,this.ar}static ur(){return new wn(0)}static cr(){return new wn(-1)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vl="LruGarbageCollector",_y=1048576;function Tl([n,e],[t,s]){const r=G(n,t);return r===0?G(e,s):r}class yy{constructor(e){this.Ir=e,this.buffer=new me(Tl),this.Er=0}dr(){return++this.Er}Ar(e){const t=[e,this.dr()];if(this.buffer.size<this.Ir)this.buffer=this.buffer.add(t);else{const s=this.buffer.last();Tl(t,s)<0&&(this.buffer=this.buffer.delete(s).add(t))}}get maxValue(){return this.buffer.last()[0]}}class Ey{constructor(e,t,s){this.garbageCollector=e,this.asyncQueue=t,this.localStore=s,this.Rr=null}start(){this.garbageCollector.params.cacheSizeCollectionThreshold!==-1&&this.Vr(6e4)}stop(){this.Rr&&(this.Rr.cancel(),this.Rr=null)}get started(){return this.Rr!==null}Vr(e){L(vl,`Garbage collection scheduled in ${e}ms`),this.Rr=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,(async()=>{this.Rr=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(t){Pn(t)?L(vl,"Ignoring IndexedDB error during garbage collection: ",t):await Cn(t)}await this.Vr(3e5)}))}}class Iy{constructor(e,t){this.mr=e,this.params=t}calculateTargetCount(e,t){return this.mr.gr(e).next((s=>Math.floor(t/100*s)))}nthSequenceNumber(e,t){if(t===0)return C.resolve(jr.ce);const s=new yy(t);return this.mr.forEachTarget(e,(r=>s.Ar(r.sequenceNumber))).next((()=>this.mr.pr(e,(r=>s.Ar(r))))).next((()=>s.maxValue))}removeTargets(e,t,s){return this.mr.removeTargets(e,t,s)}removeOrphanedDocuments(e,t){return this.mr.removeOrphanedDocuments(e,t)}collect(e,t){return this.params.cacheSizeCollectionThreshold===-1?(L("LruGarbageCollector","Garbage collection skipped; disabled"),C.resolve(Il)):this.getCacheSize(e).next((s=>s<this.params.cacheSizeCollectionThreshold?(L("LruGarbageCollector",`Garbage collection skipped; Cache size ${s} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Il):this.yr(e,t)))}getCacheSize(e){return this.mr.getCacheSize(e)}yr(e,t){let s,r,i,a,c,u,d;const f=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next((p=>(p>this.params.maximumSequenceNumbersToCollect?(L("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${p}`),r=this.params.maximumSequenceNumbersToCollect):r=p,a=Date.now(),this.nthSequenceNumber(e,r)))).next((p=>(s=p,c=Date.now(),this.removeTargets(e,s,t)))).next((p=>(i=p,u=Date.now(),this.removeOrphanedDocuments(e,s)))).next((p=>(d=Date.now(),un()<=z.DEBUG&&L("LruGarbageCollector",`LRU Garbage Collection
	Counted targets in ${a-f}ms
	Determined least recently used ${r} in `+(c-a)+`ms
	Removed ${i} targets in `+(u-c)+`ms
	Removed ${p} documents in `+(d-u)+`ms
Total Duration: ${d-f}ms`),C.resolve({didRun:!0,sequenceNumbersCollected:r,targetsRemoved:i,documentsRemoved:p}))))}}function vy(n,e){return new Iy(n,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ty{constructor(){this.changes=new sn((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,Ae.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const s=this.changes.get(t);return s!==void 0?C.resolve(s):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wy{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ay{constructor(e,t,s,r){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=s,this.indexManager=r}getDocument(e,t){let s=null;return this.documentOverlayCache.getOverlay(e,t).next((r=>(s=r,this.remoteDocumentCache.getEntry(e,t)))).next((r=>(s!==null&&ss(s.mutation,r,Me.empty(),te.now()),r)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((s=>this.getLocalViewOfDocuments(e,s,W()).next((()=>s))))}getLocalViewOfDocuments(e,t,s=W()){const r=Kt();return this.populateOverlays(e,r,t).next((()=>this.computeViews(e,t,r,s).next((i=>{let a=Qn();return i.forEach(((c,u)=>{a=a.insert(c,u.overlayedDocument)})),a}))))}getOverlayedDocuments(e,t){const s=Kt();return this.populateOverlays(e,s,t).next((()=>this.computeViews(e,t,s,W())))}populateOverlays(e,t,s){const r=[];return s.forEach((i=>{t.has(i)||r.push(i)})),this.documentOverlayCache.getOverlays(e,r).next((i=>{i.forEach(((a,c)=>{t.set(a,c)}))}))}computeViews(e,t,s,r){let i=ut();const a=ns(),c=(function(){return ns()})();return t.forEach(((u,d)=>{const f=s.get(d.key);r.has(d.key)&&(f===void 0||f.mutation instanceof Bt)?i=i.insert(d.key,d):f!==void 0?(a.set(d.key,f.mutation.getFieldMask()),ss(f.mutation,d,f.mutation.getFieldMask(),te.now())):a.set(d.key,Me.empty())})),this.recalculateAndSaveOverlays(e,i).next((u=>(u.forEach(((d,f)=>a.set(d,f))),t.forEach(((d,f)=>c.set(d,new wy(f,a.get(d)??null)))),c)))}recalculateAndSaveOverlays(e,t){const s=ns();let r=new ne(((a,c)=>a-c)),i=W();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((a=>{for(const c of a)c.keys().forEach((u=>{const d=t.get(u);if(d===null)return;let f=s.get(u)||Me.empty();f=c.applyToLocalView(d,f),s.set(u,f);const p=(r.get(c.batchId)||W()).add(u);r=r.insert(c.batchId,p)}))})).next((()=>{const a=[],c=r.getReverseIterator();for(;c.hasNext();){const u=c.getNext(),d=u.key,f=u.value,p=wh();f.forEach((y=>{if(!i.has(y)){const S=Ph(t.get(y),s.get(y));S!==null&&p.set(y,S),i=i.add(y)}})),a.push(this.documentOverlayCache.saveOverlays(e,d,p))}return C.waitFor(a)})).next((()=>s))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((s=>this.recalculateAndSaveOverlays(e,s)))}getDocumentsMatchingQuery(e,t,s,r){return(function(a){return O.isDocumentKey(a.path)&&a.collectionGroup===null&&a.filters.length===0})(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):yh(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,s,r):this.getDocumentsMatchingCollectionQuery(e,t,s,r)}getNextDocuments(e,t,s,r){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,s,r).next((i=>{const a=r-i.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,s.largestBatchId,r-i.size):C.resolve(Kt());let c=os,u=i;return a.next((d=>C.forEach(d,((f,p)=>(c<p.largestBatchId&&(c=p.largestBatchId),i.get(f)?C.resolve():this.remoteDocumentCache.getEntry(e,f).next((y=>{u=u.insert(f,y)}))))).next((()=>this.populateOverlays(e,d,i))).next((()=>this.computeViews(e,u,d,W()))).next((f=>({batchId:c,changes:Th(f)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new O(t)).next((s=>{let r=Qn();return s.isFoundDocument()&&(r=r.insert(s.key,s)),r}))}getDocumentsMatchingCollectionGroupQuery(e,t,s,r){const i=t.collectionGroup;let a=Qn();return this.indexManager.getCollectionParents(e,i).next((c=>C.forEach(c,(u=>{const d=(function(p,y){return new Is(y,null,p.explicitOrderBy.slice(),p.filters.slice(),p.limit,p.limitType,p.startAt,p.endAt)})(t,u.child(i));return this.getDocumentsMatchingCollectionQuery(e,d,s,r).next((f=>{f.forEach(((p,y)=>{a=a.insert(p,y)}))}))})).next((()=>a))))}getDocumentsMatchingCollectionQuery(e,t,s,r){let i;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,s.largestBatchId).next((a=>(i=a,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,s,i,r)))).next((a=>{i.forEach(((u,d)=>{const f=d.getKey();a.get(f)===null&&(a=a.insert(f,Ae.newInvalidDocument(f)))}));let c=Qn();return a.forEach(((u,d)=>{const f=i.get(u);f!==void 0&&ss(f.mutation,d,Me.empty(),te.now()),Gr(t,d)&&(c=c.insert(u,d))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class by{constructor(e){this.serializer=e,this.Lr=new Map,this.kr=new Map}getBundleMetadata(e,t){return C.resolve(this.Lr.get(t))}saveBundleMetadata(e,t){return this.Lr.set(t.id,(function(r){return{id:r.id,version:r.version,createTime:Je(r.createTime)}})(t)),C.resolve()}getNamedQuery(e,t){return C.resolve(this.kr.get(t))}saveNamedQuery(e,t){return this.kr.set(t.name,(function(r){return{name:r.name,query:my(r.bundledQuery),readTime:Je(r.readTime)}})(t)),C.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sy{constructor(){this.overlays=new ne(O.comparator),this.qr=new Map}getOverlay(e,t){return C.resolve(this.overlays.get(t))}getOverlays(e,t){const s=Kt();return C.forEach(t,(r=>this.getOverlay(e,r).next((i=>{i!==null&&s.set(r,i)})))).next((()=>s))}saveOverlays(e,t,s){return s.forEach(((r,i)=>{this.St(e,t,i)})),C.resolve()}removeOverlaysForBatchId(e,t,s){const r=this.qr.get(s);return r!==void 0&&(r.forEach((i=>this.overlays=this.overlays.remove(i))),this.qr.delete(s)),C.resolve()}getOverlaysForCollection(e,t,s){const r=Kt(),i=t.length+1,a=new O(t.child("")),c=this.overlays.getIteratorFrom(a);for(;c.hasNext();){const u=c.getNext().value,d=u.getKey();if(!t.isPrefixOf(d.path))break;d.path.length===i&&u.largestBatchId>s&&r.set(u.getKey(),u)}return C.resolve(r)}getOverlaysForCollectionGroup(e,t,s,r){let i=new ne(((d,f)=>d-f));const a=this.overlays.getIterator();for(;a.hasNext();){const d=a.getNext().value;if(d.getKey().getCollectionGroup()===t&&d.largestBatchId>s){let f=i.get(d.largestBatchId);f===null&&(f=Kt(),i=i.insert(d.largestBatchId,f)),f.set(d.getKey(),d)}}const c=Kt(),u=i.getIterator();for(;u.hasNext()&&(u.getNext().value.forEach(((d,f)=>c.set(d,f))),!(c.size()>=r)););return C.resolve(c)}St(e,t,s){const r=this.overlays.get(s.key);if(r!==null){const a=this.qr.get(r.largestBatchId).delete(s.key);this.qr.set(r.largestBatchId,a)}this.overlays=this.overlays.insert(s.key,new H_(t,s));let i=this.qr.get(t);i===void 0&&(i=W(),this.qr.set(t,i)),this.qr.set(t,i.add(s.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ry{constructor(){this.sessionToken=Ie.EMPTY_BYTE_STRING}getSessionToken(e){return C.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,C.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qo{constructor(){this.Qr=new me(ge.$r),this.Ur=new me(ge.Kr)}isEmpty(){return this.Qr.isEmpty()}addReference(e,t){const s=new ge(e,t);this.Qr=this.Qr.add(s),this.Ur=this.Ur.add(s)}Wr(e,t){e.forEach((s=>this.addReference(s,t)))}removeReference(e,t){this.Gr(new ge(e,t))}zr(e,t){e.forEach((s=>this.removeReference(s,t)))}jr(e){const t=new O(new Z([])),s=new ge(t,e),r=new ge(t,e+1),i=[];return this.Ur.forEachInRange([s,r],(a=>{this.Gr(a),i.push(a.key)})),i}Jr(){this.Qr.forEach((e=>this.Gr(e)))}Gr(e){this.Qr=this.Qr.delete(e),this.Ur=this.Ur.delete(e)}Hr(e){const t=new O(new Z([])),s=new ge(t,e),r=new ge(t,e+1);let i=W();return this.Ur.forEachInRange([s,r],(a=>{i=i.add(a.key)})),i}containsKey(e){const t=new ge(e,0),s=this.Qr.firstAfterOrEqual(t);return s!==null&&e.isEqual(s.key)}}class ge{constructor(e,t){this.key=e,this.Yr=t}static $r(e,t){return O.comparator(e.key,t.key)||G(e.Yr,t.Yr)}static Kr(e,t){return G(e.Yr,t.Yr)||O.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cy{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.tr=1,this.Zr=new me(ge.$r)}checkEmpty(e){return C.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,s,r){const i=this.tr;this.tr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const a=new q_(i,t,s,r);this.mutationQueue.push(a);for(const c of r)this.Zr=this.Zr.add(new ge(c.key,i)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return C.resolve(a)}lookupMutationBatch(e,t){return C.resolve(this.Xr(t))}getNextMutationBatchAfterBatchId(e,t){const s=t+1,r=this.ei(s),i=r<0?0:r;return C.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)}getHighestUnacknowledgedBatchId(){return C.resolve(this.mutationQueue.length===0?Lo:this.tr-1)}getAllMutationBatches(e){return C.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const s=new ge(t,0),r=new ge(t,Number.POSITIVE_INFINITY),i=[];return this.Zr.forEachInRange([s,r],(a=>{const c=this.Xr(a.Yr);i.push(c)})),C.resolve(i)}getAllMutationBatchesAffectingDocumentKeys(e,t){let s=new me(G);return t.forEach((r=>{const i=new ge(r,0),a=new ge(r,Number.POSITIVE_INFINITY);this.Zr.forEachInRange([i,a],(c=>{s=s.add(c.Yr)}))})),C.resolve(this.ti(s))}getAllMutationBatchesAffectingQuery(e,t){const s=t.path,r=s.length+1;let i=s;O.isDocumentKey(i)||(i=i.child(""));const a=new ge(new O(i),0);let c=new me(G);return this.Zr.forEachWhile((u=>{const d=u.key.path;return!!s.isPrefixOf(d)&&(d.length===r&&(c=c.add(u.Yr)),!0)}),a),C.resolve(this.ti(c))}ti(e){const t=[];return e.forEach((s=>{const r=this.Xr(s);r!==null&&t.push(r)})),t}removeMutationBatch(e,t){J(this.ni(t.batchId,"removed")===0,55003),this.mutationQueue.shift();let s=this.Zr;return C.forEach(t.mutations,(r=>{const i=new ge(r.key,t.batchId);return s=s.delete(i),this.referenceDelegate.markPotentiallyOrphaned(e,r.key)})).next((()=>{this.Zr=s}))}ir(e){}containsKey(e,t){const s=new ge(t,0),r=this.Zr.firstAfterOrEqual(s);return C.resolve(t.isEqual(r&&r.key))}performConsistencyCheck(e){return this.mutationQueue.length,C.resolve()}ni(e,t){return this.ei(e)}ei(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Xr(e){const t=this.ei(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Py{constructor(e){this.ri=e,this.docs=(function(){return new ne(O.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const s=t.key,r=this.docs.get(s),i=r?r.size:0,a=this.ri(t);return this.docs=this.docs.insert(s,{document:t.mutableCopy(),size:a}),this.size+=a-i,this.indexManager.addToCollectionParentIndex(e,s.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const s=this.docs.get(t);return C.resolve(s?s.document.mutableCopy():Ae.newInvalidDocument(t))}getEntries(e,t){let s=ut();return t.forEach((r=>{const i=this.docs.get(r);s=s.insert(r,i?i.document.mutableCopy():Ae.newInvalidDocument(r))})),C.resolve(s)}getDocumentsMatchingQuery(e,t,s,r){let i=ut();const a=t.path,c=new O(a.child("__id-9223372036854775808__")),u=this.docs.getIteratorFrom(c);for(;u.hasNext();){const{key:d,value:{document:f}}=u.getNext();if(!a.isPrefixOf(d.path))break;d.path.length>a.length+1||s_(n_(f),s)<=0||(r.has(f.key)||Gr(t,f))&&(i=i.insert(f.key,f.mutableCopy()))}return C.resolve(i)}getAllFromCollectionGroup(e,t,s,r){x(9500)}ii(e,t){return C.forEach(this.docs,(s=>t(s)))}newChangeBuffer(e){return new ky(this)}getSize(e){return C.resolve(this.size)}}class ky extends Ty{constructor(e){super(),this.Nr=e}applyChanges(e){const t=[];return this.changes.forEach(((s,r)=>{r.isValidDocument()?t.push(this.Nr.addEntry(e,r)):this.Nr.removeEntry(s)})),C.waitFor(t)}getFromCache(e,t){return this.Nr.getEntry(e,t)}getAllFromCache(e,t){return this.Nr.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vy{constructor(e){this.persistence=e,this.si=new sn((t=>xo(t)),Uo),this.lastRemoteSnapshotVersion=F.min(),this.highestTargetId=0,this.oi=0,this._i=new qo,this.targetCount=0,this.ai=wn.ur()}forEachTarget(e,t){return this.si.forEach(((s,r)=>t(r))),C.resolve()}getLastRemoteSnapshotVersion(e){return C.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return C.resolve(this.oi)}allocateTargetId(e){return this.highestTargetId=this.ai.next(),C.resolve(this.highestTargetId)}setTargetsMetadata(e,t,s){return s&&(this.lastRemoteSnapshotVersion=s),t>this.oi&&(this.oi=t),C.resolve()}Pr(e){this.si.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.ai=new wn(t),this.highestTargetId=t),e.sequenceNumber>this.oi&&(this.oi=e.sequenceNumber)}addTargetData(e,t){return this.Pr(t),this.targetCount+=1,C.resolve()}updateTargetData(e,t){return this.Pr(t),C.resolve()}removeTargetData(e,t){return this.si.delete(t.target),this._i.jr(t.targetId),this.targetCount-=1,C.resolve()}removeTargets(e,t,s){let r=0;const i=[];return this.si.forEach(((a,c)=>{c.sequenceNumber<=t&&s.get(c.targetId)===null&&(this.si.delete(a),i.push(this.removeMatchingKeysForTargetId(e,c.targetId)),r++)})),C.waitFor(i).next((()=>r))}getTargetCount(e){return C.resolve(this.targetCount)}getTargetData(e,t){const s=this.si.get(t)||null;return C.resolve(s)}addMatchingKeys(e,t,s){return this._i.Wr(t,s),C.resolve()}removeMatchingKeys(e,t,s){this._i.zr(t,s);const r=this.persistence.referenceDelegate,i=[];return r&&t.forEach((a=>{i.push(r.markPotentiallyOrphaned(e,a))})),C.waitFor(i)}removeMatchingKeysForTargetId(e,t){return this._i.jr(t),C.resolve()}getMatchingKeysForTargetId(e,t){const s=this._i.Hr(t);return C.resolve(s)}containsKey(e,t){return C.resolve(this._i.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $h{constructor(e,t){this.ui={},this.overlays={},this.ci=new jr(0),this.li=!1,this.li=!0,this.hi=new Ry,this.referenceDelegate=e(this),this.Pi=new Vy(this),this.indexManager=new py,this.remoteDocumentCache=(function(r){return new Py(r)})((s=>this.referenceDelegate.Ti(s))),this.serializer=new fy(t),this.Ii=new by(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.li=!1,Promise.resolve()}get started(){return this.li}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Sy,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let s=this.ui[e.toKey()];return s||(s=new Cy(t,this.referenceDelegate),this.ui[e.toKey()]=s),s}getGlobalsCache(){return this.hi}getTargetCache(){return this.Pi}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Ii}runTransaction(e,t,s){L("MemoryPersistence","Starting transaction:",e);const r=new Ny(this.ci.next());return this.referenceDelegate.Ei(),s(r).next((i=>this.referenceDelegate.di(r).next((()=>i)))).toPromise().then((i=>(r.raiseOnCommittedEvent(),i)))}Ai(e,t){return C.or(Object.values(this.ui).map((s=>()=>s.containsKey(e,t))))}}class Ny extends i_{constructor(e){super(),this.currentSequenceNumber=e}}class Ho{constructor(e){this.persistence=e,this.Ri=new qo,this.Vi=null}static mi(e){return new Ho(e)}get fi(){if(this.Vi)return this.Vi;throw x(60996)}addReference(e,t,s){return this.Ri.addReference(s,t),this.fi.delete(s.toString()),C.resolve()}removeReference(e,t,s){return this.Ri.removeReference(s,t),this.fi.add(s.toString()),C.resolve()}markPotentiallyOrphaned(e,t){return this.fi.add(t.toString()),C.resolve()}removeTarget(e,t){this.Ri.jr(t.targetId).forEach((r=>this.fi.add(r.toString())));const s=this.persistence.getTargetCache();return s.getMatchingKeysForTargetId(e,t.targetId).next((r=>{r.forEach((i=>this.fi.add(i.toString())))})).next((()=>s.removeTargetData(e,t)))}Ei(){this.Vi=new Set}di(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return C.forEach(this.fi,(s=>{const r=O.fromPath(s);return this.gi(e,r).next((i=>{i||t.removeEntry(r,F.min())}))})).next((()=>(this.Vi=null,t.apply(e))))}updateLimboDocument(e,t){return this.gi(e,t).next((s=>{s?this.fi.delete(t.toString()):this.fi.add(t.toString())}))}Ti(e){return 0}gi(e,t){return C.or([()=>C.resolve(this.Ri.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Ai(e,t)])}}class Tr{constructor(e,t){this.persistence=e,this.pi=new sn((s=>c_(s.path)),((s,r)=>s.isEqual(r))),this.garbageCollector=vy(this,t)}static mi(e,t){return new Tr(e,t)}Ei(){}di(e){return C.resolve()}forEachTarget(e,t){return this.persistence.getTargetCache().forEachTarget(e,t)}gr(e){const t=this.wr(e);return this.persistence.getTargetCache().getTargetCount(e).next((s=>t.next((r=>s+r))))}wr(e){let t=0;return this.pr(e,(s=>{t++})).next((()=>t))}pr(e,t){return C.forEach(this.pi,((s,r)=>this.br(e,s,r).next((i=>i?C.resolve():t(r)))))}removeTargets(e,t,s){return this.persistence.getTargetCache().removeTargets(e,t,s)}removeOrphanedDocuments(e,t){let s=0;const r=this.persistence.getRemoteDocumentCache(),i=r.newChangeBuffer();return r.ii(e,(a=>this.br(e,a,t).next((c=>{c||(s++,i.removeEntry(a,F.min()))})))).next((()=>i.apply(e))).next((()=>s))}markPotentiallyOrphaned(e,t){return this.pi.set(t,e.currentSequenceNumber),C.resolve()}removeTarget(e,t){const s=t.withSequenceNumber(e.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(e,s)}addReference(e,t,s){return this.pi.set(s,e.currentSequenceNumber),C.resolve()}removeReference(e,t,s){return this.pi.set(s,e.currentSequenceNumber),C.resolve()}updateLimboDocument(e,t){return this.pi.set(t,e.currentSequenceNumber),C.resolve()}Ti(e){let t=e.key.toString().length;return e.isFoundDocument()&&(t+=nr(e.data.value)),t}br(e,t,s){return C.or([()=>this.persistence.Ai(e,t),()=>this.persistence.getTargetCache().containsKey(e,t),()=>{const r=this.pi.get(t);return C.resolve(r!==void 0&&r>s)}])}getCacheSize(e){return this.persistence.getRemoteDocumentCache().getSize(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zo{constructor(e,t,s,r){this.targetId=e,this.fromCache=t,this.Es=s,this.ds=r}static As(e,t){let s=W(),r=W();for(const i of t.docChanges)switch(i.type){case 0:s=s.add(i.doc.key);break;case 1:r=r.add(i.doc.key)}return new zo(e,t.fromCache,s,r)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dy{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ly{constructor(){this.Rs=!1,this.Vs=!1,this.fs=100,this.gs=(function(){return bf()?8:o_(be())>0?6:4})()}initialize(e,t){this.ps=e,this.indexManager=t,this.Rs=!0}getDocumentsMatchingQuery(e,t,s,r){const i={result:null};return this.ys(e,t).next((a=>{i.result=a})).next((()=>{if(!i.result)return this.ws(e,t,r,s).next((a=>{i.result=a}))})).next((()=>{if(i.result)return;const a=new Dy;return this.Ss(e,t,a).next((c=>{if(i.result=c,this.Vs)return this.bs(e,t,a,c.size)}))})).next((()=>i.result))}bs(e,t,s,r){return s.documentReadCount<this.fs?(un()<=z.DEBUG&&L("QueryEngine","SDK will not create cache indexes for query:",hn(t),"since it only creates cache indexes for collection contains","more than or equal to",this.fs,"documents"),C.resolve()):(un()<=z.DEBUG&&L("QueryEngine","Query:",hn(t),"scans",s.documentReadCount,"local documents and returns",r,"documents as results."),s.documentReadCount>this.gs*r?(un()<=z.DEBUG&&L("QueryEngine","The SDK decides to create cache indexes for query:",hn(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Qe(t))):C.resolve())}ys(e,t){if(ul(t))return C.resolve(null);let s=Qe(t);return this.indexManager.getIndexType(e,s).next((r=>r===0?null:(t.limit!==null&&r===1&&(t=lo(t,null,"F"),s=Qe(t)),this.indexManager.getDocumentsMatchingTarget(e,s).next((i=>{const a=W(...i);return this.ps.getDocuments(e,a).next((c=>this.indexManager.getMinOffset(e,s).next((u=>{const d=this.Ds(t,c);return this.Cs(t,d,a,u.readTime)?this.ys(e,lo(t,null,"F")):this.vs(e,d,t,u)}))))})))))}ws(e,t,s,r){return ul(t)||r.isEqual(F.min())?C.resolve(null):this.ps.getDocuments(e,s).next((i=>{const a=this.Ds(t,i);return this.Cs(t,a,s,r)?C.resolve(null):(un()<=z.DEBUG&&L("QueryEngine","Re-using previous result from %s to execute query: %s",r.toString(),hn(t)),this.vs(e,a,t,t_(r,os)).next((c=>c)))}))}Ds(e,t){let s=new me(Ih(e));return t.forEach(((r,i)=>{Gr(e,i)&&(s=s.add(i))})),s}Cs(e,t,s,r){if(e.limit===null)return!1;if(s.size!==t.size)return!0;const i=e.limitType==="F"?t.last():t.first();return!!i&&(i.hasPendingWrites||i.version.compareTo(r)>0)}Ss(e,t,s){return un()<=z.DEBUG&&L("QueryEngine","Using full collection scan to execute query:",hn(t)),this.ps.getDocumentsMatchingQuery(e,t,Dt.min(),s)}vs(e,t,s,r){return this.ps.getDocumentsMatchingQuery(e,s,r).next((i=>(t.forEach((a=>{i=i.insert(a.key,a)})),i)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Go="LocalStore",My=3e8;class Oy{constructor(e,t,s,r){this.persistence=e,this.Fs=t,this.serializer=r,this.Ms=new ne(G),this.xs=new sn((i=>xo(i)),Uo),this.Os=new Map,this.Ns=e.getRemoteDocumentCache(),this.Pi=e.getTargetCache(),this.Ii=e.getBundleCache(),this.Bs(s)}Bs(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Ay(this.Ns,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.Ns.setIndexManager(this.indexManager),this.Fs.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.Ms)))}}function xy(n,e,t,s){return new Oy(n,e,t,s)}async function qh(n,e){const t=B(n);return await t.persistence.runTransaction("Handle user change","readonly",(s=>{let r;return t.mutationQueue.getAllMutationBatches(s).next((i=>(r=i,t.Bs(e),t.mutationQueue.getAllMutationBatches(s)))).next((i=>{const a=[],c=[];let u=W();for(const d of r){a.push(d.batchId);for(const f of d.mutations)u=u.add(f.key)}for(const d of i){c.push(d.batchId);for(const f of d.mutations)u=u.add(f.key)}return t.localDocuments.getDocuments(s,u).next((d=>({Ls:d,removedBatchIds:a,addedBatchIds:c})))}))}))}function Uy(n,e){const t=B(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(s=>{const r=e.batch.keys(),i=t.Ns.newChangeBuffer({trackRemovals:!0});return(function(c,u,d,f){const p=d.batch,y=p.keys();let S=C.resolve();return y.forEach((P=>{S=S.next((()=>f.getEntry(u,P))).next((D=>{const k=d.docVersions.get(P);J(k!==null,48541),D.version.compareTo(k)<0&&(p.applyToRemoteDocument(D,d),D.isValidDocument()&&(D.setReadTime(d.commitVersion),f.addEntry(D)))}))})),S.next((()=>c.mutationQueue.removeMutationBatch(u,p)))})(t,s,e,i).next((()=>i.apply(s))).next((()=>t.mutationQueue.performConsistencyCheck(s))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(s,r,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(s,(function(c){let u=W();for(let d=0;d<c.mutationResults.length;++d)c.mutationResults[d].transformResults.length>0&&(u=u.add(c.batch.mutations[d].key));return u})(e)))).next((()=>t.localDocuments.getDocuments(s,r)))}))}function Hh(n){const e=B(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.Pi.getLastRemoteSnapshotVersion(t)))}function Fy(n,e){const t=B(n),s=e.snapshotVersion;let r=t.Ms;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(i=>{const a=t.Ns.newChangeBuffer({trackRemovals:!0});r=t.Ms;const c=[];e.targetChanges.forEach(((f,p)=>{const y=r.get(p);if(!y)return;c.push(t.Pi.removeMatchingKeys(i,f.removedDocuments,p).next((()=>t.Pi.addMatchingKeys(i,f.addedDocuments,p))));let S=y.withSequenceNumber(i.currentSequenceNumber);e.targetMismatches.get(p)!==null?S=S.withResumeToken(Ie.EMPTY_BYTE_STRING,F.min()).withLastLimboFreeSnapshotVersion(F.min()):f.resumeToken.approximateByteSize()>0&&(S=S.withResumeToken(f.resumeToken,s)),r=r.insert(p,S),(function(D,k,j){return D.resumeToken.approximateByteSize()===0||k.snapshotVersion.toMicroseconds()-D.snapshotVersion.toMicroseconds()>=My?!0:j.addedDocuments.size+j.modifiedDocuments.size+j.removedDocuments.size>0})(y,S,f)&&c.push(t.Pi.updateTargetData(i,S))}));let u=ut(),d=W();if(e.documentUpdates.forEach((f=>{e.resolvedLimboDocuments.has(f)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(i,f))})),c.push(By(i,a,e.documentUpdates).next((f=>{u=f.ks,d=f.qs}))),!s.isEqual(F.min())){const f=t.Pi.getLastRemoteSnapshotVersion(i).next((p=>t.Pi.setTargetsMetadata(i,i.currentSequenceNumber,s)));c.push(f)}return C.waitFor(c).next((()=>a.apply(i))).next((()=>t.localDocuments.getLocalViewOfDocuments(i,u,d))).next((()=>u))})).then((i=>(t.Ms=r,i)))}function By(n,e,t){let s=W(),r=W();return t.forEach((i=>s=s.add(i))),e.getEntries(n,s).next((i=>{let a=ut();return t.forEach(((c,u)=>{const d=i.get(c);u.isFoundDocument()!==d.isFoundDocument()&&(r=r.add(c)),u.isNoDocument()&&u.version.isEqual(F.min())?(e.removeEntry(c,u.readTime),a=a.insert(c,u)):!d.isValidDocument()||u.version.compareTo(d.version)>0||u.version.compareTo(d.version)===0&&d.hasPendingWrites?(e.addEntry(u),a=a.insert(c,u)):L(Go,"Ignoring outdated watch update for ",c,". Current version:",d.version," Watch version:",u.version)})),{ks:a,qs:r}}))}function jy(n,e){const t=B(n);return t.persistence.runTransaction("Get next mutation batch","readonly",(s=>(e===void 0&&(e=Lo),t.mutationQueue.getNextMutationBatchAfterBatchId(s,e))))}function $y(n,e){const t=B(n);return t.persistence.runTransaction("Allocate target","readwrite",(s=>{let r;return t.Pi.getTargetData(s,e).next((i=>i?(r=i,C.resolve(r)):t.Pi.allocateTargetId(s).next((a=>(r=new At(e,a,"TargetPurposeListen",s.currentSequenceNumber),t.Pi.addTargetData(s,r).next((()=>r)))))))})).then((s=>{const r=t.Ms.get(s.targetId);return(r===null||s.snapshotVersion.compareTo(r.snapshotVersion)>0)&&(t.Ms=t.Ms.insert(s.targetId,s),t.xs.set(e,s.targetId)),s}))}async function po(n,e,t){const s=B(n),r=s.Ms.get(e),i=t?"readwrite":"readwrite-primary";try{t||await s.persistence.runTransaction("Release target",i,(a=>s.persistence.referenceDelegate.removeTarget(a,r)))}catch(a){if(!Pn(a))throw a;L(Go,`Failed to update sequence numbers for target ${e}: ${a}`)}s.Ms=s.Ms.remove(e),s.xs.delete(r.target)}function wl(n,e,t){const s=B(n);let r=F.min(),i=W();return s.persistence.runTransaction("Execute query","readwrite",(a=>(function(u,d,f){const p=B(u),y=p.xs.get(f);return y!==void 0?C.resolve(p.Ms.get(y)):p.Pi.getTargetData(d,f)})(s,a,Qe(e)).next((c=>{if(c)return r=c.lastLimboFreeSnapshotVersion,s.Pi.getMatchingKeysForTargetId(a,c.targetId).next((u=>{i=u}))})).next((()=>s.Fs.getDocumentsMatchingQuery(a,e,t?r:F.min(),t?i:W()))).next((c=>(qy(s,R_(e),c),{documents:c,Qs:i})))))}function qy(n,e,t){let s=n.Os.get(e)||F.min();t.forEach(((r,i)=>{i.readTime.compareTo(s)>0&&(s=i.readTime)})),n.Os.set(e,s)}class Al{constructor(){this.activeTargetIds=D_()}zs(e){this.activeTargetIds=this.activeTargetIds.add(e)}js(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Gs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Hy{constructor(){this.Mo=new Al,this.xo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,s){}addLocalQueryTarget(e,t=!0){return t&&this.Mo.zs(e),this.xo[e]||"not-current"}updateQueryState(e,t,s){this.xo[e]=t}removeLocalQueryTarget(e){this.Mo.js(e)}isLocalQueryTarget(e){return this.Mo.activeTargetIds.has(e)}clearQueryState(e){delete this.xo[e]}getAllActiveQueryTargets(){return this.Mo.activeTargetIds}isActiveQueryTarget(e){return this.Mo.activeTargetIds.has(e)}start(){return this.Mo=new Al,Promise.resolve()}handleUserChange(e,t,s){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zy{Oo(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bl="ConnectivityMonitor";class Sl{constructor(){this.No=()=>this.Bo(),this.Lo=()=>this.ko(),this.qo=[],this.Qo()}Oo(e){this.qo.push(e)}shutdown(){window.removeEventListener("online",this.No),window.removeEventListener("offline",this.Lo)}Qo(){window.addEventListener("online",this.No),window.addEventListener("offline",this.Lo)}Bo(){L(bl,"Network connectivity changed: AVAILABLE");for(const e of this.qo)e(0)}ko(){L(bl,"Network connectivity changed: UNAVAILABLE");for(const e of this.qo)e(1)}static v(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Qs=null;function go(){return Qs===null?Qs=(function(){return 268435456+Math.round(2147483648*Math.random())})():Qs++,"0x"+Qs.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qi="RestConnection",Gy={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};class Wy{get $o(){return!1}constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",s=encodeURIComponent(this.databaseId.projectId),r=encodeURIComponent(this.databaseId.database);this.Uo=t+"://"+e.host,this.Ko=`projects/${s}/databases/${r}`,this.Wo=this.databaseId.database===gr?`project_id=${s}`:`project_id=${s}&database_id=${r}`}Go(e,t,s,r,i){const a=go(),c=this.zo(e,t.toUriEncodedString());L(qi,`Sending RPC '${e}' ${a}:`,c,s);const u={"google-cloud-resource-prefix":this.Ko,"x-goog-request-params":this.Wo};this.jo(u,r,i);const{host:d}=new URL(c),f=dt(d);return this.Jo(e,c,u,s,f).then((p=>(L(qi,`Received RPC '${e}' ${a}: `,p),p)),(p=>{throw En(qi,`RPC '${e}' ${a} failed with error: `,p,"url: ",c,"request:",s),p}))}Ho(e,t,s,r,i,a){return this.Go(e,t,s,r,i)}jo(e,t,s){e["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+Rn})(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach(((r,i)=>e[i]=r)),s&&s.headers.forEach(((r,i)=>e[i]=r))}zo(e,t){const s=Gy[e];return`${this.Uo}/v1/${t}:${s}`}terminate(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ky{constructor(e){this.Yo=e.Yo,this.Zo=e.Zo}Xo(e){this.e_=e}t_(e){this.n_=e}r_(e){this.i_=e}onMessage(e){this.s_=e}close(){this.Zo()}send(e){this.Yo(e)}o_(){this.e_()}__(){this.n_()}a_(e){this.i_(e)}u_(e){this.s_(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Te="WebChannelConnection";class Qy extends Wy{constructor(e){super(e),this.c_=[],this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Jo(e,t,s,r,i){const a=go();return new Promise(((c,u)=>{const d=new Wu;d.setWithCredentials(!0),d.listenOnce(Ku.COMPLETE,(()=>{try{switch(d.getLastErrorCode()){case tr.NO_ERROR:const p=d.getResponseJson();L(Te,`XHR for RPC '${e}' ${a} received:`,JSON.stringify(p)),c(p);break;case tr.TIMEOUT:L(Te,`RPC '${e}' ${a} timed out`),u(new N(R.DEADLINE_EXCEEDED,"Request time out"));break;case tr.HTTP_ERROR:const y=d.getStatus();if(L(Te,`RPC '${e}' ${a} failed with status:`,y,"response text:",d.getResponseText()),y>0){let S=d.getResponseJson();Array.isArray(S)&&(S=S[0]);const P=S?.error;if(P&&P.status&&P.message){const D=(function(j){const K=j.toLowerCase().replace(/_/g,"-");return Object.values(R).indexOf(K)>=0?K:R.UNKNOWN})(P.status);u(new N(D,P.message))}else u(new N(R.UNKNOWN,"Server responded with status "+d.getStatus()))}else u(new N(R.UNAVAILABLE,"Connection failed."));break;default:x(9055,{l_:e,streamId:a,h_:d.getLastErrorCode(),P_:d.getLastError()})}}finally{L(Te,`RPC '${e}' ${a} completed.`)}}));const f=JSON.stringify(r);L(Te,`RPC '${e}' ${a} sending request:`,r),d.send(t,"POST",f,s,15)}))}T_(e,t,s){const r=go(),i=[this.Uo,"/","google.firestore.v1.Firestore","/",e,"/channel"],a=Xu(),c=Ju(),u={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},d=this.longPollingOptions.timeoutSeconds;d!==void 0&&(u.longPollingTimeout=Math.round(1e3*d)),this.useFetchStreams&&(u.useFetchStreams=!0),this.jo(u.initMessageHeaders,t,s),u.encodeInitMessageHeaders=!0;const f=i.join("");L(Te,`Creating RPC '${e}' stream ${r}: ${f}`,u);const p=a.createWebChannel(f,u);this.I_(p);let y=!1,S=!1;const P=new Ky({Yo:k=>{S?L(Te,`Not sending because RPC '${e}' stream ${r} is closed:`,k):(y||(L(Te,`Opening RPC '${e}' stream ${r} transport.`),p.open(),y=!0),L(Te,`RPC '${e}' stream ${r} sending:`,k),p.send(k))},Zo:()=>p.close()}),D=(k,j,K)=>{k.listen(j,(H=>{try{K(H)}catch(X){setTimeout((()=>{throw X}),0)}}))};return D(p,Kn.EventType.OPEN,(()=>{S||(L(Te,`RPC '${e}' stream ${r} transport opened.`),P.o_())})),D(p,Kn.EventType.CLOSE,(()=>{S||(S=!0,L(Te,`RPC '${e}' stream ${r} transport closed`),P.a_(),this.E_(p))})),D(p,Kn.EventType.ERROR,(k=>{S||(S=!0,En(Te,`RPC '${e}' stream ${r} transport errored. Name:`,k.name,"Message:",k.message),P.a_(new N(R.UNAVAILABLE,"The operation could not be completed")))})),D(p,Kn.EventType.MESSAGE,(k=>{if(!S){const j=k.data[0];J(!!j,16349);const K=j,H=K?.error||K[0]?.error;if(H){L(Te,`RPC '${e}' stream ${r} received error:`,H);const X=H.status;let de=(function(g){const E=ce[g];if(E!==void 0)return Vh(E)})(X),se=H.message;de===void 0&&(de=R.INTERNAL,se="Unknown error status: "+X+" with message "+H.message),S=!0,P.a_(new N(de,se)),p.close()}else L(Te,`RPC '${e}' stream ${r} received:`,j),P.u_(j)}})),D(c,Qu.STAT_EVENT,(k=>{k.stat===no.PROXY?L(Te,`RPC '${e}' stream ${r} detected buffering proxy`):k.stat===no.NOPROXY&&L(Te,`RPC '${e}' stream ${r} detected no buffering proxy`)})),setTimeout((()=>{P.__()}),0),P}terminate(){this.c_.forEach((e=>e.close())),this.c_=[]}I_(e){this.c_.push(e)}E_(e){this.c_=this.c_.filter((t=>t===e))}}function Hi(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Xr(n){return new Z_(n,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zh{constructor(e,t,s=1e3,r=1.5,i=6e4){this.Mi=e,this.timerId=t,this.d_=s,this.A_=r,this.R_=i,this.V_=0,this.m_=null,this.f_=Date.now(),this.reset()}reset(){this.V_=0}g_(){this.V_=this.R_}p_(e){this.cancel();const t=Math.floor(this.V_+this.y_()),s=Math.max(0,Date.now()-this.f_),r=Math.max(0,t-s);r>0&&L("ExponentialBackoff",`Backing off for ${r} ms (base delay: ${this.V_} ms, delay with jitter: ${t} ms, last attempt: ${s} ms ago)`),this.m_=this.Mi.enqueueAfterDelay(this.timerId,r,(()=>(this.f_=Date.now(),e()))),this.V_*=this.A_,this.V_<this.d_&&(this.V_=this.d_),this.V_>this.R_&&(this.V_=this.R_)}w_(){this.m_!==null&&(this.m_.skipDelay(),this.m_=null)}cancel(){this.m_!==null&&(this.m_.cancel(),this.m_=null)}y_(){return(Math.random()-.5)*this.V_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rl="PersistentStream";class Gh{constructor(e,t,s,r,i,a,c,u){this.Mi=e,this.S_=s,this.b_=r,this.connection=i,this.authCredentialsProvider=a,this.appCheckCredentialsProvider=c,this.listener=u,this.state=0,this.D_=0,this.C_=null,this.v_=null,this.stream=null,this.F_=0,this.M_=new zh(e,t)}x_(){return this.state===1||this.state===5||this.O_()}O_(){return this.state===2||this.state===3}start(){this.F_=0,this.state!==4?this.auth():this.N_()}async stop(){this.x_()&&await this.close(0)}B_(){this.state=0,this.M_.reset()}L_(){this.O_()&&this.C_===null&&(this.C_=this.Mi.enqueueAfterDelay(this.S_,6e4,(()=>this.k_())))}q_(e){this.Q_(),this.stream.send(e)}async k_(){if(this.O_())return this.close(0)}Q_(){this.C_&&(this.C_.cancel(),this.C_=null)}U_(){this.v_&&(this.v_.cancel(),this.v_=null)}async close(e,t){this.Q_(),this.U_(),this.M_.cancel(),this.D_++,e!==4?this.M_.reset():t&&t.code===R.RESOURCE_EXHAUSTED?(lt(t.toString()),lt("Using maximum backoff delay to prevent overloading the backend."),this.M_.g_()):t&&t.code===R.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.K_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.r_(t)}K_(){}auth(){this.state=1;const e=this.W_(this.D_),t=this.D_;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([s,r])=>{this.D_===t&&this.G_(s,r)}),(s=>{e((()=>{const r=new N(R.UNKNOWN,"Fetching auth token failed: "+s.message);return this.z_(r)}))}))}G_(e,t){const s=this.W_(this.D_);this.stream=this.j_(e,t),this.stream.Xo((()=>{s((()=>this.listener.Xo()))})),this.stream.t_((()=>{s((()=>(this.state=2,this.v_=this.Mi.enqueueAfterDelay(this.b_,1e4,(()=>(this.O_()&&(this.state=3),Promise.resolve()))),this.listener.t_())))})),this.stream.r_((r=>{s((()=>this.z_(r)))})),this.stream.onMessage((r=>{s((()=>++this.F_==1?this.J_(r):this.onNext(r)))}))}N_(){this.state=5,this.M_.p_((async()=>{this.state=0,this.start()}))}z_(e){return L(Rl,`close with error: ${e}`),this.stream=null,this.close(4,e)}W_(e){return t=>{this.Mi.enqueueAndForget((()=>this.D_===e?t():(L(Rl,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class Jy extends Gh{constructor(e,t,s,r,i,a){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,s,r,a),this.serializer=i}j_(e,t){return this.connection.T_("Listen",e,t)}J_(e){return this.onNext(e)}onNext(e){this.M_.reset();const t=ny(this.serializer,e),s=(function(i){if(!("targetChange"in i))return F.min();const a=i.targetChange;return a.targetIds&&a.targetIds.length?F.min():a.readTime?Je(a.readTime):F.min()})(e);return this.listener.H_(t,s)}Y_(e){const t={};t.database=mo(this.serializer),t.addTarget=(function(i,a){let c;const u=a.target;if(c=ao(u)?{documents:iy(i,u)}:{query:oy(i,u).ft},c.targetId=a.targetId,a.resumeToken.approximateByteSize()>0){c.resumeToken=Lh(i,a.resumeToken);const d=uo(i,a.expectedCount);d!==null&&(c.expectedCount=d)}else if(a.snapshotVersion.compareTo(F.min())>0){c.readTime=vr(i,a.snapshotVersion.toTimestamp());const d=uo(i,a.expectedCount);d!==null&&(c.expectedCount=d)}return c})(this.serializer,e);const s=cy(this.serializer,e);s&&(t.labels=s),this.q_(t)}Z_(e){const t={};t.database=mo(this.serializer),t.removeTarget=e,this.q_(t)}}class Xy extends Gh{constructor(e,t,s,r,i,a){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,s,r,a),this.serializer=i}get X_(){return this.F_>0}start(){this.lastStreamToken=void 0,super.start()}K_(){this.X_&&this.ea([])}j_(e,t){return this.connection.T_("Write",e,t)}J_(e){return J(!!e.streamToken,31322),this.lastStreamToken=e.streamToken,J(!e.writeResults||e.writeResults.length===0,55816),this.listener.ta()}onNext(e){J(!!e.streamToken,12678),this.lastStreamToken=e.streamToken,this.M_.reset();const t=ry(e.writeResults,e.commitTime),s=Je(e.commitTime);return this.listener.na(s,t)}ra(){const e={};e.database=mo(this.serializer),this.q_(e)}ea(e){const t={streamToken:this.lastStreamToken,writes:e.map((s=>sy(this.serializer,s)))};this.q_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yy{}class Zy extends Yy{constructor(e,t,s,r){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=s,this.serializer=r,this.ia=!1}sa(){if(this.ia)throw new N(R.FAILED_PRECONDITION,"The client has already been terminated.")}Go(e,t,s,r){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([i,a])=>this.connection.Go(e,ho(t,s),r,i,a))).catch((i=>{throw i.name==="FirebaseError"?(i.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),i):new N(R.UNKNOWN,i.toString())}))}Ho(e,t,s,r,i){return this.sa(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([a,c])=>this.connection.Ho(e,ho(t,s),r,a,c,i))).catch((a=>{throw a.name==="FirebaseError"?(a.code===R.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),a):new N(R.UNKNOWN,a.toString())}))}terminate(){this.ia=!0,this.connection.terminate()}}class eE{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.oa=0,this._a=null,this.aa=!0}ua(){this.oa===0&&(this.ca("Unknown"),this._a=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this._a=null,this.la("Backend didn't respond within 10 seconds."),this.ca("Offline"),Promise.resolve()))))}ha(e){this.state==="Online"?this.ca("Unknown"):(this.oa++,this.oa>=1&&(this.Pa(),this.la(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.ca("Offline")))}set(e){this.Pa(),this.oa=0,e==="Online"&&(this.aa=!1),this.ca(e)}ca(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}la(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.aa?(lt(t),this.aa=!1):L("OnlineStateTracker",t)}Pa(){this._a!==null&&(this._a.cancel(),this._a=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tn="RemoteStore";class tE{constructor(e,t,s,r,i){this.localStore=e,this.datastore=t,this.asyncQueue=s,this.remoteSyncer={},this.Ta=[],this.Ia=new Map,this.Ea=new Set,this.da=[],this.Aa=i,this.Aa.Oo((a=>{s.enqueueAndForget((async()=>{rn(this)&&(L(tn,"Restarting streams for network reachability change."),await(async function(u){const d=B(u);d.Ea.add(4),await ws(d),d.Ra.set("Unknown"),d.Ea.delete(4),await Yr(d)})(this))}))})),this.Ra=new eE(s,r)}}async function Yr(n){if(rn(n))for(const e of n.da)await e(!0)}async function ws(n){for(const e of n.da)await e(!1)}function Wh(n,e){const t=B(n);t.Ia.has(e.targetId)||(t.Ia.set(e.targetId,e),Jo(t)?Qo(t):kn(t).O_()&&Ko(t,e))}function Wo(n,e){const t=B(n),s=kn(t);t.Ia.delete(e),s.O_()&&Kh(t,e),t.Ia.size===0&&(s.O_()?s.L_():rn(t)&&t.Ra.set("Unknown"))}function Ko(n,e){if(n.Va.Ue(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(F.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}kn(n).Y_(e)}function Kh(n,e){n.Va.Ue(e),kn(n).Z_(e)}function Qo(n){n.Va=new Q_({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),At:e=>n.Ia.get(e)||null,ht:()=>n.datastore.serializer.databaseId}),kn(n).start(),n.Ra.ua()}function Jo(n){return rn(n)&&!kn(n).x_()&&n.Ia.size>0}function rn(n){return B(n).Ea.size===0}function Qh(n){n.Va=void 0}async function nE(n){n.Ra.set("Online")}async function sE(n){n.Ia.forEach(((e,t)=>{Ko(n,e)}))}async function rE(n,e){Qh(n),Jo(n)?(n.Ra.ha(e),Qo(n)):n.Ra.set("Unknown")}async function iE(n,e,t){if(n.Ra.set("Online"),e instanceof Dh&&e.state===2&&e.cause)try{await(async function(r,i){const a=i.cause;for(const c of i.targetIds)r.Ia.has(c)&&(await r.remoteSyncer.rejectListen(c,a),r.Ia.delete(c),r.Va.removeTarget(c))})(n,e)}catch(s){L(tn,"Failed to remove targets %s: %s ",e.targetIds.join(","),s),await wr(n,s)}else if(e instanceof ir?n.Va.Ze(e):e instanceof Nh?n.Va.st(e):n.Va.tt(e),!t.isEqual(F.min()))try{const s=await Hh(n.localStore);t.compareTo(s)>=0&&await(function(i,a){const c=i.Va.Tt(a);return c.targetChanges.forEach(((u,d)=>{if(u.resumeToken.approximateByteSize()>0){const f=i.Ia.get(d);f&&i.Ia.set(d,f.withResumeToken(u.resumeToken,a))}})),c.targetMismatches.forEach(((u,d)=>{const f=i.Ia.get(u);if(!f)return;i.Ia.set(u,f.withResumeToken(Ie.EMPTY_BYTE_STRING,f.snapshotVersion)),Kh(i,u);const p=new At(f.target,u,d,f.sequenceNumber);Ko(i,p)})),i.remoteSyncer.applyRemoteEvent(c)})(n,t)}catch(s){L(tn,"Failed to raise snapshot:",s),await wr(n,s)}}async function wr(n,e,t){if(!Pn(e))throw e;n.Ea.add(1),await ws(n),n.Ra.set("Offline"),t||(t=()=>Hh(n.localStore)),n.asyncQueue.enqueueRetryable((async()=>{L(tn,"Retrying IndexedDB access"),await t(),n.Ea.delete(1),await Yr(n)}))}function Jh(n,e){return e().catch((t=>wr(n,t,e)))}async function Zr(n){const e=B(n),t=xt(e);let s=e.Ta.length>0?e.Ta[e.Ta.length-1].batchId:Lo;for(;oE(e);)try{const r=await jy(e.localStore,s);if(r===null){e.Ta.length===0&&t.L_();break}s=r.batchId,aE(e,r)}catch(r){await wr(e,r)}Xh(e)&&Yh(e)}function oE(n){return rn(n)&&n.Ta.length<10}function aE(n,e){n.Ta.push(e);const t=xt(n);t.O_()&&t.X_&&t.ea(e.mutations)}function Xh(n){return rn(n)&&!xt(n).x_()&&n.Ta.length>0}function Yh(n){xt(n).start()}async function cE(n){xt(n).ra()}async function lE(n){const e=xt(n);for(const t of n.Ta)e.ea(t.mutations)}async function uE(n,e,t){const s=n.Ta.shift(),r=Bo.from(s,e,t);await Jh(n,(()=>n.remoteSyncer.applySuccessfulWrite(r))),await Zr(n)}async function hE(n,e){e&&xt(n).X_&&await(async function(s,r){if((function(a){return G_(a)&&a!==R.ABORTED})(r.code)){const i=s.Ta.shift();xt(s).B_(),await Jh(s,(()=>s.remoteSyncer.rejectFailedWrite(i.batchId,r))),await Zr(s)}})(n,e),Xh(n)&&Yh(n)}async function Cl(n,e){const t=B(n);t.asyncQueue.verifyOperationInProgress(),L(tn,"RemoteStore received new credentials");const s=rn(t);t.Ea.add(3),await ws(t),s&&t.Ra.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.Ea.delete(3),await Yr(t)}async function dE(n,e){const t=B(n);e?(t.Ea.delete(2),await Yr(t)):e||(t.Ea.add(2),await ws(t),t.Ra.set("Unknown"))}function kn(n){return n.ma||(n.ma=(function(t,s,r){const i=B(t);return i.sa(),new Jy(s,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,r)})(n.datastore,n.asyncQueue,{Xo:nE.bind(null,n),t_:sE.bind(null,n),r_:rE.bind(null,n),H_:iE.bind(null,n)}),n.da.push((async e=>{e?(n.ma.B_(),Jo(n)?Qo(n):n.Ra.set("Unknown")):(await n.ma.stop(),Qh(n))}))),n.ma}function xt(n){return n.fa||(n.fa=(function(t,s,r){const i=B(t);return i.sa(),new Xy(s,i.connection,i.authCredentials,i.appCheckCredentials,i.serializer,r)})(n.datastore,n.asyncQueue,{Xo:()=>Promise.resolve(),t_:cE.bind(null,n),r_:hE.bind(null,n),ta:lE.bind(null,n),na:uE.bind(null,n)}),n.da.push((async e=>{e?(n.fa.B_(),await Zr(n)):(await n.fa.stop(),n.Ta.length>0&&(L(tn,`Stopping write stream with ${n.Ta.length} pending writes`),n.Ta=[]))}))),n.fa}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xo{constructor(e,t,s,r,i){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=s,this.op=r,this.removalCallback=i,this.deferred=new rt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((a=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,s,r,i){const a=Date.now()+s,c=new Xo(e,t,a,r,i);return c.start(s),c}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new N(R.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Yo(n,e){if(lt("AsyncQueue",`${e}: ${n}`),Pn(n))return new N(R.UNAVAILABLE,`${e}: ${n}`);throw n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yn{static emptySet(e){return new yn(e.comparator)}constructor(e){this.comparator=e?(t,s)=>e(t,s)||O.comparator(t.key,s.key):(t,s)=>O.comparator(t.key,s.key),this.keyedMap=Qn(),this.sortedSet=new ne(this.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,s)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof yn)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),s=e.sortedSet.getIterator();for(;t.hasNext();){const r=t.getNext().key,i=s.getNext().key;if(!r.isEqual(i))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const s=new yn;return s.comparator=this.comparator,s.keyedMap=e,s.sortedSet=t,s}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pl{constructor(){this.ga=new ne(O.comparator)}track(e){const t=e.doc.key,s=this.ga.get(t);s?e.type!==0&&s.type===3?this.ga=this.ga.insert(t,e):e.type===3&&s.type!==1?this.ga=this.ga.insert(t,{type:s.type,doc:e.doc}):e.type===2&&s.type===2?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):e.type===2&&s.type===0?this.ga=this.ga.insert(t,{type:0,doc:e.doc}):e.type===1&&s.type===0?this.ga=this.ga.remove(t):e.type===1&&s.type===2?this.ga=this.ga.insert(t,{type:1,doc:s.doc}):e.type===0&&s.type===1?this.ga=this.ga.insert(t,{type:2,doc:e.doc}):x(63341,{Rt:e,pa:s}):this.ga=this.ga.insert(t,e)}ya(){const e=[];return this.ga.inorderTraversal(((t,s)=>{e.push(s)})),e}}class An{constructor(e,t,s,r,i,a,c,u,d){this.query=e,this.docs=t,this.oldDocs=s,this.docChanges=r,this.mutatedKeys=i,this.fromCache=a,this.syncStateChanged=c,this.excludesMetadataChanges=u,this.hasCachedResults=d}static fromInitialDocuments(e,t,s,r,i){const a=[];return t.forEach((c=>{a.push({type:0,doc:c})})),new An(e,t,yn.emptySet(t),a,s,r,!0,!1,i)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&zr(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,s=e.docChanges;if(t.length!==s.length)return!1;for(let r=0;r<t.length;r++)if(t[r].type!==s[r].type||!t[r].doc.isEqual(s[r].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fE{constructor(){this.wa=void 0,this.Sa=[]}ba(){return this.Sa.some((e=>e.Da()))}}class mE{constructor(){this.queries=kl(),this.onlineState="Unknown",this.Ca=new Set}terminate(){(function(t,s){const r=B(t),i=r.queries;r.queries=kl(),i.forEach(((a,c)=>{for(const u of c.Sa)u.onError(s)}))})(this,new N(R.ABORTED,"Firestore shutting down"))}}function kl(){return new sn((n=>Eh(n)),zr)}async function Zo(n,e){const t=B(n);let s=3;const r=e.query;let i=t.queries.get(r);i?!i.ba()&&e.Da()&&(s=2):(i=new fE,s=e.Da()?0:1);try{switch(s){case 0:i.wa=await t.onListen(r,!0);break;case 1:i.wa=await t.onListen(r,!1);break;case 2:await t.onFirstRemoteStoreListen(r)}}catch(a){const c=Yo(a,`Initialization of query '${hn(e.query)}' failed`);return void e.onError(c)}t.queries.set(r,i),i.Sa.push(e),e.va(t.onlineState),i.wa&&e.Fa(i.wa)&&ta(t)}async function ea(n,e){const t=B(n),s=e.query;let r=3;const i=t.queries.get(s);if(i){const a=i.Sa.indexOf(e);a>=0&&(i.Sa.splice(a,1),i.Sa.length===0?r=e.Da()?0:1:!i.ba()&&e.Da()&&(r=2))}switch(r){case 0:return t.queries.delete(s),t.onUnlisten(s,!0);case 1:return t.queries.delete(s),t.onUnlisten(s,!1);case 2:return t.onLastRemoteStoreUnlisten(s);default:return}}function pE(n,e){const t=B(n);let s=!1;for(const r of e){const i=r.query,a=t.queries.get(i);if(a){for(const c of a.Sa)c.Fa(r)&&(s=!0);a.wa=r}}s&&ta(t)}function gE(n,e,t){const s=B(n),r=s.queries.get(e);if(r)for(const i of r.Sa)i.onError(t);s.queries.delete(e)}function ta(n){n.Ca.forEach((e=>{e.next()}))}var _o,Vl;(Vl=_o||(_o={})).Ma="default",Vl.Cache="cache";class na{constructor(e,t,s){this.query=e,this.xa=t,this.Oa=!1,this.Na=null,this.onlineState="Unknown",this.options=s||{}}Fa(e){if(!this.options.includeMetadataChanges){const s=[];for(const r of e.docChanges)r.type!==3&&s.push(r);e=new An(e.query,e.docs,e.oldDocs,s,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Oa?this.Ba(e)&&(this.xa.next(e),t=!0):this.La(e,this.onlineState)&&(this.ka(e),t=!0),this.Na=e,t}onError(e){this.xa.error(e)}va(e){this.onlineState=e;let t=!1;return this.Na&&!this.Oa&&this.La(this.Na,e)&&(this.ka(this.Na),t=!0),t}La(e,t){if(!e.fromCache||!this.Da())return!0;const s=t!=="Offline";return(!this.options.qa||!s)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}Ba(e){if(e.docChanges.length>0)return!0;const t=this.Na&&this.Na.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}ka(e){e=An.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Oa=!0,this.xa.next(e)}Da(){return this.options.source!==_o.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(e){this.key=e}}class ed{constructor(e){this.key=e}}class _E{constructor(e,t){this.query=e,this.Ya=t,this.Za=null,this.hasCachedResults=!1,this.current=!1,this.Xa=W(),this.mutatedKeys=W(),this.eu=Ih(e),this.tu=new yn(this.eu)}get nu(){return this.Ya}ru(e,t){const s=t?t.iu:new Pl,r=t?t.tu:this.tu;let i=t?t.mutatedKeys:this.mutatedKeys,a=r,c=!1;const u=this.query.limitType==="F"&&r.size===this.query.limit?r.last():null,d=this.query.limitType==="L"&&r.size===this.query.limit?r.first():null;if(e.inorderTraversal(((f,p)=>{const y=r.get(f),S=Gr(this.query,p)?p:null,P=!!y&&this.mutatedKeys.has(y.key),D=!!S&&(S.hasLocalMutations||this.mutatedKeys.has(S.key)&&S.hasCommittedMutations);let k=!1;y&&S?y.data.isEqual(S.data)?P!==D&&(s.track({type:3,doc:S}),k=!0):this.su(y,S)||(s.track({type:2,doc:S}),k=!0,(u&&this.eu(S,u)>0||d&&this.eu(S,d)<0)&&(c=!0)):!y&&S?(s.track({type:0,doc:S}),k=!0):y&&!S&&(s.track({type:1,doc:y}),k=!0,(u||d)&&(c=!0)),k&&(S?(a=a.add(S),i=D?i.add(f):i.delete(f)):(a=a.delete(f),i=i.delete(f)))})),this.query.limit!==null)for(;a.size>this.query.limit;){const f=this.query.limitType==="F"?a.last():a.first();a=a.delete(f.key),i=i.delete(f.key),s.track({type:1,doc:f})}return{tu:a,iu:s,Cs:c,mutatedKeys:i}}su(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,s,r){const i=this.tu;this.tu=e.tu,this.mutatedKeys=e.mutatedKeys;const a=e.iu.ya();a.sort(((f,p)=>(function(S,P){const D=k=>{switch(k){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return x(20277,{Rt:k})}};return D(S)-D(P)})(f.type,p.type)||this.eu(f.doc,p.doc))),this.ou(s),r=r??!1;const c=t&&!r?this._u():[],u=this.Xa.size===0&&this.current&&!r?1:0,d=u!==this.Za;return this.Za=u,a.length!==0||d?{snapshot:new An(this.query,e.tu,i,a,e.mutatedKeys,u===0,d,!1,!!s&&s.resumeToken.approximateByteSize()>0),au:c}:{au:c}}va(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({tu:this.tu,iu:new Pl,mutatedKeys:this.mutatedKeys,Cs:!1},!1)):{au:[]}}uu(e){return!this.Ya.has(e)&&!!this.tu.has(e)&&!this.tu.get(e).hasLocalMutations}ou(e){e&&(e.addedDocuments.forEach((t=>this.Ya=this.Ya.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.Ya=this.Ya.delete(t))),this.current=e.current)}_u(){if(!this.current)return[];const e=this.Xa;this.Xa=W(),this.tu.forEach((s=>{this.uu(s.key)&&(this.Xa=this.Xa.add(s.key))}));const t=[];return e.forEach((s=>{this.Xa.has(s)||t.push(new ed(s))})),this.Xa.forEach((s=>{e.has(s)||t.push(new Zh(s))})),t}cu(e){this.Ya=e.Qs,this.Xa=W();const t=this.ru(e.documents);return this.applyChanges(t,!0)}lu(){return An.fromInitialDocuments(this.query,this.tu,this.mutatedKeys,this.Za===0,this.hasCachedResults)}}const sa="SyncEngine";class yE{constructor(e,t,s){this.query=e,this.targetId=t,this.view=s}}class EE{constructor(e){this.key=e,this.hu=!1}}class IE{constructor(e,t,s,r,i,a){this.localStore=e,this.remoteStore=t,this.eventManager=s,this.sharedClientState=r,this.currentUser=i,this.maxConcurrentLimboResolutions=a,this.Pu={},this.Tu=new sn((c=>Eh(c)),zr),this.Iu=new Map,this.Eu=new Set,this.du=new ne(O.comparator),this.Au=new Map,this.Ru=new qo,this.Vu={},this.mu=new Map,this.fu=wn.cr(),this.onlineState="Unknown",this.gu=void 0}get isPrimaryClient(){return this.gu===!0}}async function vE(n,e,t=!0){const s=od(n);let r;const i=s.Tu.get(e);return i?(s.sharedClientState.addLocalQueryTarget(i.targetId),r=i.view.lu()):r=await td(s,e,t,!0),r}async function TE(n,e){const t=od(n);await td(t,e,!0,!1)}async function td(n,e,t,s){const r=await $y(n.localStore,Qe(e)),i=r.targetId,a=n.sharedClientState.addLocalQueryTarget(i,t);let c;return s&&(c=await wE(n,e,i,a==="current",r.resumeToken)),n.isPrimaryClient&&t&&Wh(n.remoteStore,r),c}async function wE(n,e,t,s,r){n.pu=(p,y,S)=>(async function(D,k,j,K){let H=k.view.ru(j);H.Cs&&(H=await wl(D.localStore,k.query,!1).then((({documents:v})=>k.view.ru(v,H))));const X=K&&K.targetChanges.get(k.targetId),de=K&&K.targetMismatches.get(k.targetId)!=null,se=k.view.applyChanges(H,D.isPrimaryClient,X,de);return Dl(D,k.targetId,se.au),se.snapshot})(n,p,y,S);const i=await wl(n.localStore,e,!0),a=new _E(e,i.Qs),c=a.ru(i.documents),u=Ts.createSynthesizedTargetChangeForCurrentChange(t,s&&n.onlineState!=="Offline",r),d=a.applyChanges(c,n.isPrimaryClient,u);Dl(n,t,d.au);const f=new yE(e,t,a);return n.Tu.set(e,f),n.Iu.has(t)?n.Iu.get(t).push(e):n.Iu.set(t,[e]),d.snapshot}async function AE(n,e,t){const s=B(n),r=s.Tu.get(e),i=s.Iu.get(r.targetId);if(i.length>1)return s.Iu.set(r.targetId,i.filter((a=>!zr(a,e)))),void s.Tu.delete(e);s.isPrimaryClient?(s.sharedClientState.removeLocalQueryTarget(r.targetId),s.sharedClientState.isActiveQueryTarget(r.targetId)||await po(s.localStore,r.targetId,!1).then((()=>{s.sharedClientState.clearQueryState(r.targetId),t&&Wo(s.remoteStore,r.targetId),yo(s,r.targetId)})).catch(Cn)):(yo(s,r.targetId),await po(s.localStore,r.targetId,!0))}async function bE(n,e){const t=B(n),s=t.Tu.get(e),r=t.Iu.get(s.targetId);t.isPrimaryClient&&r.length===1&&(t.sharedClientState.removeLocalQueryTarget(s.targetId),Wo(t.remoteStore,s.targetId))}async function SE(n,e,t){const s=DE(n);try{const r=await(function(a,c){const u=B(a),d=te.now(),f=c.reduce(((S,P)=>S.add(P.key)),W());let p,y;return u.persistence.runTransaction("Locally write mutations","readwrite",(S=>{let P=ut(),D=W();return u.Ns.getEntries(S,f).next((k=>{P=k,P.forEach(((j,K)=>{K.isValidDocument()||(D=D.add(j))}))})).next((()=>u.localDocuments.getOverlayedDocuments(S,P))).next((k=>{p=k;const j=[];for(const K of c){const H=j_(K,p.get(K.key).overlayedDocument);H!=null&&j.push(new Bt(K.key,H,hh(H.value.mapValue),Ne.exists(!0)))}return u.mutationQueue.addMutationBatch(S,d,j,c)})).next((k=>{y=k;const j=k.applyToLocalDocumentSet(p,D);return u.documentOverlayCache.saveOverlays(S,k.batchId,j)}))})).then((()=>({batchId:y.batchId,changes:Th(p)})))})(s.localStore,e);s.sharedClientState.addPendingMutation(r.batchId),(function(a,c,u){let d=a.Vu[a.currentUser.toKey()];d||(d=new ne(G)),d=d.insert(c,u),a.Vu[a.currentUser.toKey()]=d})(s,r.batchId,t),await As(s,r.changes),await Zr(s.remoteStore)}catch(r){const i=Yo(r,"Failed to persist write");t.reject(i)}}async function nd(n,e){const t=B(n);try{const s=await Fy(t.localStore,e);e.targetChanges.forEach(((r,i)=>{const a=t.Au.get(i);a&&(J(r.addedDocuments.size+r.modifiedDocuments.size+r.removedDocuments.size<=1,22616),r.addedDocuments.size>0?a.hu=!0:r.modifiedDocuments.size>0?J(a.hu,14607):r.removedDocuments.size>0&&(J(a.hu,42227),a.hu=!1))})),await As(t,s,e)}catch(s){await Cn(s)}}function Nl(n,e,t){const s=B(n);if(s.isPrimaryClient&&t===0||!s.isPrimaryClient&&t===1){const r=[];s.Tu.forEach(((i,a)=>{const c=a.view.va(e);c.snapshot&&r.push(c.snapshot)})),(function(a,c){const u=B(a);u.onlineState=c;let d=!1;u.queries.forEach(((f,p)=>{for(const y of p.Sa)y.va(c)&&(d=!0)})),d&&ta(u)})(s.eventManager,e),r.length&&s.Pu.H_(r),s.onlineState=e,s.isPrimaryClient&&s.sharedClientState.setOnlineState(e)}}async function RE(n,e,t){const s=B(n);s.sharedClientState.updateQueryState(e,"rejected",t);const r=s.Au.get(e),i=r&&r.key;if(i){let a=new ne(O.comparator);a=a.insert(i,Ae.newNoDocument(i,F.min()));const c=W().add(i),u=new Jr(F.min(),new Map,new ne(G),a,c);await nd(s,u),s.du=s.du.remove(i),s.Au.delete(e),ra(s)}else await po(s.localStore,e,!1).then((()=>yo(s,e,t))).catch(Cn)}async function CE(n,e){const t=B(n),s=e.batch.batchId;try{const r=await Uy(t.localStore,e);rd(t,s,null),sd(t,s),t.sharedClientState.updateMutationState(s,"acknowledged"),await As(t,r)}catch(r){await Cn(r)}}async function PE(n,e,t){const s=B(n);try{const r=await(function(a,c){const u=B(a);return u.persistence.runTransaction("Reject batch","readwrite-primary",(d=>{let f;return u.mutationQueue.lookupMutationBatch(d,c).next((p=>(J(p!==null,37113),f=p.keys(),u.mutationQueue.removeMutationBatch(d,p)))).next((()=>u.mutationQueue.performConsistencyCheck(d))).next((()=>u.documentOverlayCache.removeOverlaysForBatchId(d,f,c))).next((()=>u.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(d,f))).next((()=>u.localDocuments.getDocuments(d,f)))}))})(s.localStore,e);rd(s,e,t),sd(s,e),s.sharedClientState.updateMutationState(e,"rejected",t),await As(s,r)}catch(r){await Cn(r)}}function sd(n,e){(n.mu.get(e)||[]).forEach((t=>{t.resolve()})),n.mu.delete(e)}function rd(n,e,t){const s=B(n);let r=s.Vu[s.currentUser.toKey()];if(r){const i=r.get(e);i&&(t?i.reject(t):i.resolve(),r=r.remove(e)),s.Vu[s.currentUser.toKey()]=r}}function yo(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const s of n.Iu.get(e))n.Tu.delete(s),t&&n.Pu.yu(s,t);n.Iu.delete(e),n.isPrimaryClient&&n.Ru.jr(e).forEach((s=>{n.Ru.containsKey(s)||id(n,s)}))}function id(n,e){n.Eu.delete(e.path.canonicalString());const t=n.du.get(e);t!==null&&(Wo(n.remoteStore,t),n.du=n.du.remove(e),n.Au.delete(t),ra(n))}function Dl(n,e,t){for(const s of t)s instanceof Zh?(n.Ru.addReference(s.key,e),kE(n,s)):s instanceof ed?(L(sa,"Document no longer in limbo: "+s.key),n.Ru.removeReference(s.key,e),n.Ru.containsKey(s.key)||id(n,s.key)):x(19791,{wu:s})}function kE(n,e){const t=e.key,s=t.path.canonicalString();n.du.get(t)||n.Eu.has(s)||(L(sa,"New document in limbo: "+t),n.Eu.add(s),ra(n))}function ra(n){for(;n.Eu.size>0&&n.du.size<n.maxConcurrentLimboResolutions;){const e=n.Eu.values().next().value;n.Eu.delete(e);const t=new O(Z.fromString(e)),s=n.fu.next();n.Au.set(s,new EE(t)),n.du=n.du.insert(t,s),Wh(n.remoteStore,new At(Qe(Hr(t.path)),s,"TargetPurposeLimboResolution",jr.ce))}}async function As(n,e,t){const s=B(n),r=[],i=[],a=[];s.Tu.isEmpty()||(s.Tu.forEach(((c,u)=>{a.push(s.pu(u,e,t).then((d=>{if((d||t)&&s.isPrimaryClient){const f=d?!d.fromCache:t?.targetChanges.get(u.targetId)?.current;s.sharedClientState.updateQueryState(u.targetId,f?"current":"not-current")}if(d){r.push(d);const f=zo.As(u.targetId,d);i.push(f)}})))})),await Promise.all(a),s.Pu.H_(r),await(async function(u,d){const f=B(u);try{await f.persistence.runTransaction("notifyLocalViewChanges","readwrite",(p=>C.forEach(d,(y=>C.forEach(y.Es,(S=>f.persistence.referenceDelegate.addReference(p,y.targetId,S))).next((()=>C.forEach(y.ds,(S=>f.persistence.referenceDelegate.removeReference(p,y.targetId,S)))))))))}catch(p){if(!Pn(p))throw p;L(Go,"Failed to update sequence numbers: "+p)}for(const p of d){const y=p.targetId;if(!p.fromCache){const S=f.Ms.get(y),P=S.snapshotVersion,D=S.withLastLimboFreeSnapshotVersion(P);f.Ms=f.Ms.insert(y,D)}}})(s.localStore,i))}async function VE(n,e){const t=B(n);if(!t.currentUser.isEqual(e)){L(sa,"User change. New user:",e.toKey());const s=await qh(t.localStore,e);t.currentUser=e,(function(i,a){i.mu.forEach((c=>{c.forEach((u=>{u.reject(new N(R.CANCELLED,a))}))})),i.mu.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,s.removedBatchIds,s.addedBatchIds),await As(t,s.Ls)}}function NE(n,e){const t=B(n),s=t.Au.get(e);if(s&&s.hu)return W().add(s.key);{let r=W();const i=t.Iu.get(e);if(!i)return r;for(const a of i){const c=t.Tu.get(a);r=r.unionWith(c.view.nu)}return r}}function od(n){const e=B(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=nd.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=NE.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=RE.bind(null,e),e.Pu.H_=pE.bind(null,e.eventManager),e.Pu.yu=gE.bind(null,e.eventManager),e}function DE(n){const e=B(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=CE.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=PE.bind(null,e),e}class Ar{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Xr(e.databaseInfo.databaseId),this.sharedClientState=this.Du(e),this.persistence=this.Cu(e),await this.persistence.start(),this.localStore=this.vu(e),this.gcScheduler=this.Fu(e,this.localStore),this.indexBackfillerScheduler=this.Mu(e,this.localStore)}Fu(e,t){return null}Mu(e,t){return null}vu(e){return xy(this.persistence,new Ly,e.initialUser,this.serializer)}Cu(e){return new $h(Ho.mi,this.serializer)}Du(e){return new Hy}async terminate(){this.gcScheduler?.stop(),this.indexBackfillerScheduler?.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Ar.provider={build:()=>new Ar};class LE extends Ar{constructor(e){super(),this.cacheSizeBytes=e}Fu(e,t){J(this.persistence.referenceDelegate instanceof Tr,46915);const s=this.persistence.referenceDelegate.garbageCollector;return new Ey(s,e.asyncQueue,t)}Cu(e){const t=this.cacheSizeBytes!==void 0?Pe.withCacheSize(this.cacheSizeBytes):Pe.DEFAULT;return new $h((s=>Tr.mi(s,t)),this.serializer)}}class Eo{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=s=>Nl(this.syncEngine,s,1),this.remoteStore.remoteSyncer.handleCredentialChange=VE.bind(null,this.syncEngine),await dE(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new mE})()}createDatastore(e){const t=Xr(e.databaseInfo.databaseId),s=(function(i){return new Qy(i)})(e.databaseInfo);return(function(i,a,c,u){return new Zy(i,a,c,u)})(e.authCredentials,e.appCheckCredentials,s,t)}createRemoteStore(e){return(function(s,r,i,a,c){return new tE(s,r,i,a,c)})(this.localStore,this.datastore,e.asyncQueue,(t=>Nl(this.syncEngine,t,0)),(function(){return Sl.v()?new Sl:new zy})())}createSyncEngine(e,t){return(function(r,i,a,c,u,d,f){const p=new IE(r,i,a,c,u,d);return f&&(p.gu=!0),p})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){await(async function(t){const s=B(t);L(tn,"RemoteStore shutting down."),s.Ea.add(5),await ws(s),s.Aa.shutdown(),s.Ra.set("Unknown")})(this.remoteStore),this.datastore?.terminate(),this.eventManager?.terminate()}}Eo.provider={build:()=>new Eo};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ia{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ou(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ou(this.observer.error,e):lt("Uncaught Error in snapshot listener:",e.toString()))}Nu(){this.muted=!0}Ou(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ut="FirestoreClient";class ME{constructor(e,t,s,r,i){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=s,this.databaseInfo=r,this.user=we.UNAUTHENTICATED,this.clientId=Do.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=i,this.authCredentials.start(s,(async a=>{L(Ut,"Received user=",a.uid),await this.authCredentialListener(a),this.user=a})),this.appCheckCredentials.start(s,(a=>(L(Ut,"Received new app check token=",a),this.appCheckCredentialListener(a,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new rt;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const s=Yo(t,"Failed to shutdown persistence");e.reject(s)}})),e.promise}}async function zi(n,e){n.asyncQueue.verifyOperationInProgress(),L(Ut,"Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let s=t.initialUser;n.setCredentialChangeListener((async r=>{s.isEqual(r)||(await qh(e.localStore,r),s=r)})),e.persistence.setDatabaseDeletedListener((()=>n.terminate())),n._offlineComponents=e}async function Ll(n,e){n.asyncQueue.verifyOperationInProgress();const t=await OE(n);L(Ut,"Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener((s=>Cl(e.remoteStore,s))),n.setAppCheckTokenChangeListener(((s,r)=>Cl(e.remoteStore,r))),n._onlineComponents=e}async function OE(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){L(Ut,"Using user provided OfflineComponentProvider");try{await zi(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(r){return r.name==="FirebaseError"?r.code===R.FAILED_PRECONDITION||r.code===R.UNIMPLEMENTED:!(typeof DOMException<"u"&&r instanceof DOMException)||r.code===22||r.code===20||r.code===11})(t))throw t;En("Error using user provided cache. Falling back to memory cache: "+t),await zi(n,new Ar)}}else L(Ut,"Using default OfflineComponentProvider"),await zi(n,new LE(void 0));return n._offlineComponents}async function ad(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(L(Ut,"Using user provided OnlineComponentProvider"),await Ll(n,n._uninitializedComponentsProvider._online)):(L(Ut,"Using default OnlineComponentProvider"),await Ll(n,new Eo))),n._onlineComponents}function xE(n){return ad(n).then((e=>e.syncEngine))}async function br(n){const e=await ad(n),t=e.eventManager;return t.onListen=vE.bind(null,e.syncEngine),t.onUnlisten=AE.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=TE.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=bE.bind(null,e.syncEngine),t}function UE(n,e,t={}){const s=new rt;return n.asyncQueue.enqueueAndForget((async()=>(function(i,a,c,u,d){const f=new ia({next:y=>{f.Nu(),a.enqueueAndForget((()=>ea(i,p)));const S=y.docs.has(c);!S&&y.fromCache?d.reject(new N(R.UNAVAILABLE,"Failed to get document because the client is offline.")):S&&y.fromCache&&u&&u.source==="server"?d.reject(new N(R.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):d.resolve(y)},error:y=>d.reject(y)}),p=new na(Hr(c.path),f,{includeMetadataChanges:!0,qa:!0});return Zo(i,p)})(await br(n),n.asyncQueue,e,t,s))),s.promise}function FE(n,e,t={}){const s=new rt;return n.asyncQueue.enqueueAndForget((async()=>(function(i,a,c,u,d){const f=new ia({next:y=>{f.Nu(),a.enqueueAndForget((()=>ea(i,p))),y.fromCache&&u.source==="server"?d.reject(new N(R.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):d.resolve(y)},error:y=>d.reject(y)}),p=new na(c,f,{includeMetadataChanges:!0,qa:!0});return Zo(i,p)})(await br(n),n.asyncQueue,e,t,s))),s.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cd(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ml=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ld="firestore.googleapis.com",Ol=!0;class xl{constructor(e){if(e.host===void 0){if(e.ssl!==void 0)throw new N(R.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=ld,this.ssl=Ol}else this.host=e.host,this.ssl=e.ssl??Ol;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=jh;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<_y)throw new N(R.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}e_("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=cd(e.experimentalLongPollingOptions??{}),(function(s){if(s.timeoutSeconds!==void 0){if(isNaN(s.timeoutSeconds))throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (must not be NaN)`);if(s.timeoutSeconds<5)throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (minimum allowed value is 5)`);if(s.timeoutSeconds>30)throw new N(R.INVALID_ARGUMENT,`invalid long polling timeout: ${s.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(s,r){return s.timeoutSeconds===r.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class ei{constructor(e,t,s,r){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=s,this._app=r,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new xl({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new N(R.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new N(R.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new xl(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(s){if(!s)return new Hg;switch(s.type){case"firstParty":return new Kg(s.sessionIndex||"0",s.iamToken||null,s.authTokenFactory||null);case"provider":return s.client;default:throw new N(R.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const s=Ml.get(t);s&&(L("ComponentProvider","Removing Datastore"),Ml.delete(t),s.terminate())})(this),Promise.resolve()}}function BE(n,e,t,s={}){n=Oe(n,ei);const r=dt(e),i=n._getSettings(),a={...i,emulatorOptions:n._getEmulatorOptions()},c=`${e}:${t}`;r&&(Dr(`https://${c}`),Lr("Firestore",!0)),i.host!==ld&&i.host!==c&&En("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const u={...i,host:c,ssl:r,emulatorOptions:s};if(!Yt(u,a)&&(n._setSettings(u),s.mockUserToken)){let d,f;if(typeof s.mockUserToken=="string")d=s.mockUserToken,f=we.MOCK_USER;else{d=cu(s.mockUserToken,n._app?.options.projectId);const p=s.mockUserToken.sub||s.mockUserToken.user_id;if(!p)throw new N(R.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");f=new we(p)}n._authCredentials=new zg(new Zu(d,f))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class on{constructor(e,t,s){this.converter=t,this._query=s,this.type="query",this.firestore=e}withConverter(e){return new on(this.firestore,e,this._query)}}class ae{constructor(e,t,s){this.converter=t,this._key=s,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new kt(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new ae(this.firestore,e,this._key)}toJSON(){return{type:ae._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,t,s){if(Es(t,ae._jsonSchema))return new ae(e,s||null,new O(Z.fromString(t.referencePath)))}}ae._jsonSchemaVersion="firestore/documentReference/1.0",ae._jsonSchema={type:he("string",ae._jsonSchemaVersion),referencePath:he("string")};class kt extends on{constructor(e,t,s){super(e,t,Hr(s)),this._path=s,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ae(this.firestore,null,new O(e))}withConverter(e){return new kt(this.firestore,e,this._path)}}function le(n,e,...t){if(n=ie(n),eh("collection","path",e),n instanceof ei){const s=Z.fromString(e,...t);return Jc(s),new kt(n,null,s)}{if(!(n instanceof ae||n instanceof kt))throw new N(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const s=n._path.child(Z.fromString(e,...t));return Jc(s),new kt(n.firestore,null,s)}}function Ee(n,e,...t){if(n=ie(n),arguments.length===1&&(e=Do.newId()),eh("doc","path",e),n instanceof ei){const s=Z.fromString(e,...t);return Qc(s),new ae(n,null,new O(s))}{if(!(n instanceof ae||n instanceof kt))throw new N(R.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const s=n._path.child(Z.fromString(e,...t));return Qc(s),new ae(n.firestore,n instanceof kt?n.converter:null,new O(s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ul="AsyncQueue";class Fl{constructor(e=Promise.resolve()){this.Xu=[],this.ec=!1,this.tc=[],this.nc=null,this.rc=!1,this.sc=!1,this.oc=[],this.M_=new zh(this,"async_queue_retry"),this._c=()=>{const s=Hi();s&&L(Ul,"Visibility state changed to "+s.visibilityState),this.M_.w_()},this.ac=e;const t=Hi();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this._c)}get isShuttingDown(){return this.ec}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.uc(),this.cc(e)}enterRestrictedMode(e){if(!this.ec){this.ec=!0,this.sc=e||!1;const t=Hi();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this._c)}}enqueue(e){if(this.uc(),this.ec)return new Promise((()=>{}));const t=new rt;return this.cc((()=>this.ec&&this.sc?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Xu.push(e),this.lc())))}async lc(){if(this.Xu.length!==0){try{await this.Xu[0](),this.Xu.shift(),this.M_.reset()}catch(e){if(!Pn(e))throw e;L(Ul,"Operation failed with retryable error: "+e)}this.Xu.length>0&&this.M_.p_((()=>this.lc()))}}cc(e){const t=this.ac.then((()=>(this.rc=!0,e().catch((s=>{throw this.nc=s,this.rc=!1,lt("INTERNAL UNHANDLED ERROR: ",Bl(s)),s})).then((s=>(this.rc=!1,s))))));return this.ac=t,t}enqueueAfterDelay(e,t,s){this.uc(),this.oc.indexOf(e)>-1&&(t=0);const r=Xo.createAndSchedule(this,e,t,s,(i=>this.hc(i)));return this.tc.push(r),r}uc(){this.nc&&x(47125,{Pc:Bl(this.nc)})}verifyOperationInProgress(){}async Tc(){let e;do e=this.ac,await e;while(e!==this.ac)}Ic(e){for(const t of this.tc)if(t.timerId===e)return!0;return!1}Ec(e){return this.Tc().then((()=>{this.tc.sort(((t,s)=>t.targetTimeMs-s.targetTimeMs));for(const t of this.tc)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.Tc()}))}dc(e){this.oc.push(e)}hc(e){const t=this.tc.indexOf(e);this.tc.splice(t,1)}}function Bl(n){let e=n.message||"";return n.stack&&(e=n.stack.includes(n.message)?n.stack:n.message+`
`+n.stack),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jl(n){return(function(t,s){if(typeof t!="object"||t===null)return!1;const r=t;for(const i of s)if(i in r&&typeof r[i]=="function")return!0;return!1})(n,["next","error","complete"])}class ht extends ei{constructor(e,t,s,r){super(e,t,s,r),this.type="firestore",this._queue=new Fl,this._persistenceKey=r?.name||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Fl(e),this._firestoreClient=void 0,await e}}}function jE(n,e){const t=typeof n=="object"?n:Mr(),s=typeof n=="string"?n:gr,r=ps(t,"firestore").getImmediate({identifier:s});if(!r._initialized){const i=To("firestore");i&&BE(r,...i)}return r}function bs(n){if(n._terminated)throw new N(R.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||$E(n),n._firestoreClient}function $E(n){const e=n._freezeSettings(),t=(function(r,i,a,c){return new h_(r,i,a,c.host,c.ssl,c.experimentalForceLongPolling,c.experimentalAutoDetectLongPolling,cd(c.experimentalLongPollingOptions),c.useFetchStreams,c.isUsingEmulator)})(n._databaseId,n._app?.options.appId||"",n._persistenceKey,e);n._componentsProvider||e.localCache?._offlineComponentProvider&&e.localCache?._onlineComponentProvider&&(n._componentsProvider={_offline:e.localCache._offlineComponentProvider,_online:e.localCache._onlineComponentProvider}),n._firestoreClient=new ME(n._authCredentials,n._appCheckCredentials,n._queue,t,n._componentsProvider&&(function(r){const i=r?._online.build();return{_offline:r?._offline.build(i),_online:i}})(n._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xe{constructor(e){this._byteString=e}static fromBase64String(e){try{return new xe(Ie.fromBase64String(e))}catch(t){throw new N(R.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new xe(Ie.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:xe._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Es(e,xe._jsonSchema))return xe.fromBase64String(e.bytes)}}xe._jsonSchemaVersion="firestore/bytes/1.0",xe._jsonSchema={type:he("string",xe._jsonSchemaVersion),bytes:he("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ss{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new N(R.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ye(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ti{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xe{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new N(R.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new N(R.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return G(this._lat,e._lat)||G(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:Xe._jsonSchemaVersion}}static fromJSON(e){if(Es(e,Xe._jsonSchema))return new Xe(e.latitude,e.longitude)}}Xe._jsonSchemaVersion="firestore/geoPoint/1.0",Xe._jsonSchema={type:he("string",Xe._jsonSchemaVersion),latitude:he("number"),longitude:he("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ye{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(s,r){if(s.length!==r.length)return!1;for(let i=0;i<s.length;++i)if(s[i]!==r[i])return!1;return!0})(this._values,e._values)}toJSON(){return{type:Ye._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Es(e,Ye._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((t=>typeof t=="number")))return new Ye(e.vectorValues);throw new N(R.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Ye._jsonSchemaVersion="firestore/vectorValue/1.0",Ye._jsonSchema={type:he("string",Ye._jsonSchemaVersion),vectorValues:he("object")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qE=/^__.*__$/;class HE{constructor(e,t,s){this.data=e,this.fieldMask=t,this.fieldTransforms=s}toMutation(e,t){return this.fieldMask!==null?new Bt(e,this.data,this.fieldMask,t,this.fieldTransforms):new vs(e,this.data,t,this.fieldTransforms)}}class ud{constructor(e,t,s){this.data=e,this.fieldMask=t,this.fieldTransforms=s}toMutation(e,t){return new Bt(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function hd(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw x(40011,{Ac:n})}}class oa{constructor(e,t,s,r,i,a){this.settings=e,this.databaseId=t,this.serializer=s,this.ignoreUndefinedProperties=r,i===void 0&&this.Rc(),this.fieldTransforms=i||[],this.fieldMask=a||[]}get path(){return this.settings.path}get Ac(){return this.settings.Ac}Vc(e){return new oa({...this.settings,...e},this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}mc(e){const t=this.path?.child(e),s=this.Vc({path:t,fc:!1});return s.gc(e),s}yc(e){const t=this.path?.child(e),s=this.Vc({path:t,fc:!1});return s.Rc(),s}wc(e){return this.Vc({path:void 0,fc:!0})}Sc(e){return Sr(e,this.settings.methodName,this.settings.bc||!1,this.path,this.settings.Dc)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}Rc(){if(this.path)for(let e=0;e<this.path.length;e++)this.gc(this.path.get(e))}gc(e){if(e.length===0)throw this.Sc("Document fields must not be empty");if(hd(this.Ac)&&qE.test(e))throw this.Sc('Document fields cannot begin and end with "__"')}}class zE{constructor(e,t,s){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=s||Xr(e)}Cc(e,t,s,r=!1){return new oa({Ac:e,methodName:t,Dc:s,path:ye.emptyPath(),fc:!1,bc:r},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function ni(n){const e=n._freezeSettings(),t=Xr(n._databaseId);return new zE(n._databaseId,!!e.ignoreUndefinedProperties,t)}function dd(n,e,t,s,r,i={}){const a=n.Cc(i.merge||i.mergeFields?2:0,e,t,r);ca("Data must be an object, but it was:",a,s);const c=pd(s,a);let u,d;if(i.merge)u=new Me(a.fieldMask),d=a.fieldTransforms;else if(i.mergeFields){const f=[];for(const p of i.mergeFields){const y=Io(e,p,t);if(!a.contains(y))throw new N(R.INVALID_ARGUMENT,`Field '${y}' is specified in your field mask but missing from your input data.`);_d(f,y)||f.push(y)}u=new Me(f),d=a.fieldTransforms.filter((p=>u.covers(p.field)))}else u=null,d=a.fieldTransforms;return new HE(new ke(c),u,d)}class si extends ti{_toFieldTransform(e){if(e.Ac!==2)throw e.Ac===1?e.Sc(`${this._methodName}() can only appear at the top level of your update data`):e.Sc(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof si}}class aa extends ti{_toFieldTransform(e){return new x_(e.path,new us)}isEqual(e){return e instanceof aa}}function fd(n,e,t,s){const r=n.Cc(1,e,t);ca("Data must be an object, but it was:",r,s);const i=[],a=ke.empty();Ft(s,((u,d)=>{const f=la(e,u,t);d=ie(d);const p=r.yc(f);if(d instanceof si)i.push(f);else{const y=Rs(d,p);y!=null&&(i.push(f),a.set(f,y))}}));const c=new Me(i);return new ud(a,c,r.fieldTransforms)}function md(n,e,t,s,r,i){const a=n.Cc(1,e,t),c=[Io(e,s,t)],u=[r];if(i.length%2!=0)throw new N(R.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let y=0;y<i.length;y+=2)c.push(Io(e,i[y])),u.push(i[y+1]);const d=[],f=ke.empty();for(let y=c.length-1;y>=0;--y)if(!_d(d,c[y])){const S=c[y];let P=u[y];P=ie(P);const D=a.yc(S);if(P instanceof si)d.push(S);else{const k=Rs(P,D);k!=null&&(d.push(S),f.set(S,k))}}const p=new Me(d);return new ud(f,p,a.fieldTransforms)}function GE(n,e,t,s=!1){return Rs(t,n.Cc(s?4:3,e))}function Rs(n,e){if(gd(n=ie(n)))return ca("Unsupported field value:",e,n),pd(n,e);if(n instanceof ti)return(function(s,r){if(!hd(r.Ac))throw r.Sc(`${s._methodName}() can only be used with update() and set()`);if(!r.path)throw r.Sc(`${s._methodName}() is not currently supported inside arrays`);const i=s._toFieldTransform(r);i&&r.fieldTransforms.push(i)})(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.fc&&e.Ac!==4)throw e.Sc("Nested arrays are not supported");return(function(s,r){const i=[];let a=0;for(const c of s){let u=Rs(c,r.wc(a));u==null&&(u={nullValue:"NULL_VALUE"}),i.push(u),a++}return{arrayValue:{values:i}}})(n,e)}return(function(s,r){if((s=ie(s))===null)return{nullValue:"NULL_VALUE"};if(typeof s=="number")return L_(r.serializer,s);if(typeof s=="boolean")return{booleanValue:s};if(typeof s=="string")return{stringValue:s};if(s instanceof Date){const i=te.fromDate(s);return{timestampValue:vr(r.serializer,i)}}if(s instanceof te){const i=new te(s.seconds,1e3*Math.floor(s.nanoseconds/1e3));return{timestampValue:vr(r.serializer,i)}}if(s instanceof Xe)return{geoPointValue:{latitude:s.latitude,longitude:s.longitude}};if(s instanceof xe)return{bytesValue:Lh(r.serializer,s._byteString)};if(s instanceof ae){const i=r.databaseId,a=s.firestore._databaseId;if(!a.isEqual(i))throw r.Sc(`Document reference is for database ${a.projectId}/${a.database} but should be for database ${i.projectId}/${i.database}`);return{referenceValue:$o(s.firestore._databaseId||r.databaseId,s._key.path)}}if(s instanceof Ye)return(function(a,c){return{mapValue:{fields:{[lh]:{stringValue:uh},[_r]:{arrayValue:{values:a.toArray().map((d=>{if(typeof d!="number")throw c.Sc("VectorValues must only contain numeric values.");return Fo(c.serializer,d)}))}}}}}})(s,r);throw r.Sc(`Unsupported field value: ${Br(s)}`)})(n,e)}function pd(n,e){const t={};return sh(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):Ft(n,((s,r)=>{const i=Rs(r,e.mc(s));i!=null&&(t[s]=i)})),{mapValue:{fields:t}}}function gd(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof te||n instanceof Xe||n instanceof xe||n instanceof ae||n instanceof ti||n instanceof Ye)}function ca(n,e,t){if(!gd(t)||!th(t)){const s=Br(t);throw s==="an object"?e.Sc(n+" a custom object"):e.Sc(n+" "+s)}}function Io(n,e,t){if((e=ie(e))instanceof Ss)return e._internalPath;if(typeof e=="string")return la(n,e);throw Sr("Field path arguments must be of type string or ",n,!1,void 0,t)}const WE=new RegExp("[~\\*/\\[\\]]");function la(n,e,t){if(e.search(WE)>=0)throw Sr(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new Ss(...e.split("."))._internalPath}catch{throw Sr(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Sr(n,e,t,s,r){const i=s&&!s.isEmpty(),a=r!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let u="";return(i||a)&&(u+=" (found",i&&(u+=` in field ${s}`),a&&(u+=` in document ${r}`),u+=")"),new N(R.INVALID_ARGUMENT,c+n+u)}function _d(n,e){return n.some((t=>t.isEqual(e)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yd{constructor(e,t,s,r,i){this._firestore=e,this._userDataWriter=t,this._key=s,this._document=r,this._converter=i}get id(){return this._key.path.lastSegment()}get ref(){return new ae(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new KE(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(ua("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class KE extends yd{data(){return super.data()}}function ua(n,e){return typeof e=="string"?la(n,e):e instanceof Ss?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ed(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new N(R.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class ha{}class QE extends ha{}function Ue(n,e,...t){let s=[];e instanceof ha&&s.push(e),s=s.concat(t),(function(i){const a=i.filter((u=>u instanceof da)).length,c=i.filter((u=>u instanceof ri)).length;if(a>1||a>0&&c>0)throw new N(R.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")})(s);for(const r of s)n=r._apply(n);return n}class ri extends QE{constructor(e,t,s){super(),this._field=e,this._op=t,this._value=s,this.type="where"}static _create(e,t,s){return new ri(e,t,s)}_apply(e){const t=this._parse(e);return Id(e._query,t),new on(e.firestore,e.converter,co(e._query,t))}_parse(e){const t=ni(e.firestore);return(function(i,a,c,u,d,f,p){let y;if(d.isKeyField()){if(f==="array-contains"||f==="array-contains-any")throw new N(R.INVALID_ARGUMENT,`Invalid Query. You can't perform '${f}' queries on documentId().`);if(f==="in"||f==="not-in"){ql(p,f);const P=[];for(const D of p)P.push($l(u,i,D));y={arrayValue:{values:P}}}else y=$l(u,i,p)}else f!=="in"&&f!=="not-in"&&f!=="array-contains-any"||ql(p,f),y=GE(c,a,p,f==="in"||f==="not-in");return ue.create(d,f,y)})(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value)}}function Rr(n,e,t){const s=e,r=ua("where",n);return ri._create(r,s,t)}class da extends ha{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new da(e,t)}_parse(e){const t=this._queryConstraints.map((s=>s._parse(e))).filter((s=>s.getFilters().length>0));return t.length===1?t[0]:$e.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return t.getFilters().length===0?e:((function(r,i){let a=r;const c=i.getFlattenedFilters();for(const u of c)Id(a,u),a=co(a,u)})(e._query,t),new on(e.firestore,e.converter,co(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return this.type==="and"?"and":"or"}}function $l(n,e,t){if(typeof(t=ie(t))=="string"){if(t==="")throw new N(R.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!yh(e)&&t.indexOf("/")!==-1)throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${t}' contains a '/' character.`);const s=e.path.child(Z.fromString(t));if(!O.isDocumentKey(s))throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${s}' is not because it has an odd number of segments (${s.length}).`);return rl(n,new O(s))}if(t instanceof ae)return rl(n,t._key);throw new N(R.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${Br(t)}.`)}function ql(n,e){if(!Array.isArray(n)||n.length===0)throw new N(R.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${e.toString()}' filters.`)}function Id(n,e){const t=(function(r,i){for(const a of r)for(const c of a.getFlattenedFilters())if(i.indexOf(c.op)>=0)return c.op;return null})(n.filters,(function(r){switch(r){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}})(e.op));if(t!==null)throw t===e.op?new N(R.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${e.op.toString()}' filter.`):new N(R.INVALID_ARGUMENT,`Invalid query. You cannot use '${e.op.toString()}' filters with '${t.toString()}' filters.`)}class JE{convertValue(e,t="none"){switch(Ot(e)){case 0:return null;case 1:return e.booleanValue;case 2:return oe(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Mt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw x(62114,{value:e})}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const s={};return Ft(e,((r,i)=>{s[r]=this.convertValue(i,t)})),s}convertVectorValue(e){const t=e.fields?.[_r].arrayValue?.values?.map((s=>oe(s.doubleValue)));return new Ye(t)}convertGeoPoint(e){return new Xe(oe(e.latitude),oe(e.longitude))}convertArray(e,t){return(e.values||[]).map((s=>this.convertValue(s,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const s=qr(e);return s==null?null:this.convertValue(s,t);case"estimate":return this.convertTimestamp(as(e));default:return null}}convertTimestamp(e){const t=Lt(e);return new te(t.seconds,t.nanos)}convertDocumentKey(e,t){const s=Z.fromString(e);J(Bh(s),9688,{name:e});const r=new cs(s.get(1),s.get(3)),i=new O(s.popFirst(5));return r.isEqual(t)||lt(`Document ${i} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),i}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vd(n,e,t){let s;return s=n?t&&(t.merge||t.mergeFields)?n.toFirestore(e,t):n.toFirestore(e):e,s}class Xn{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Qt extends yd{constructor(e,t,s,r,i,a){super(e,t,s,r,a),this._firestore=e,this._firestoreImpl=e,this.metadata=i}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new or(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const s=this._document.data.field(ua("DocumentSnapshot.get",e));if(s!==null)return this._userDataWriter.convertValue(s,t.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new N(R.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,t={};return t.type=Qt._jsonSchemaVersion,t.bundle="",t.bundleSource="DocumentSnapshot",t.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?t:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),t.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),t)}}Qt._jsonSchemaVersion="firestore/documentSnapshot/1.0",Qt._jsonSchema={type:he("string",Qt._jsonSchemaVersion),bundleSource:he("string","DocumentSnapshot"),bundleName:he("string"),bundle:he("string")};class or extends Qt{data(e={}){return super.data(e)}}class Jt{constructor(e,t,s,r){this._firestore=e,this._userDataWriter=t,this._snapshot=r,this.metadata=new Xn(r.hasPendingWrites,r.fromCache),this.query=s}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((s=>{e.call(t,new or(this._firestore,this._userDataWriter,s.key,s,new Xn(this._snapshot.mutatedKeys.has(s.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new N(R.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(r,i){if(r._snapshot.oldDocs.isEmpty()){let a=0;return r._snapshot.docChanges.map((c=>{const u=new or(r._firestore,r._userDataWriter,c.doc.key,c.doc,new Xn(r._snapshot.mutatedKeys.has(c.doc.key),r._snapshot.fromCache),r.query.converter);return c.doc,{type:"added",doc:u,oldIndex:-1,newIndex:a++}}))}{let a=r._snapshot.oldDocs;return r._snapshot.docChanges.filter((c=>i||c.type!==3)).map((c=>{const u=new or(r._firestore,r._userDataWriter,c.doc.key,c.doc,new Xn(r._snapshot.mutatedKeys.has(c.doc.key),r._snapshot.fromCache),r.query.converter);let d=-1,f=-1;return c.type!==0&&(d=a.indexOf(c.doc.key),a=a.delete(c.doc.key)),c.type!==1&&(a=a.add(c.doc),f=a.indexOf(c.doc.key)),{type:XE(c.type),doc:u,oldIndex:d,newIndex:f}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new N(R.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Jt._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Do.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const t=[],s=[],r=[];return this.docs.forEach((i=>{i._document!==null&&(t.push(i._document),s.push(this._userDataWriter.convertObjectMap(i._document.data.value.mapValue.fields,"previous")),r.push(i.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function XE(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return x(61501,{type:n})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Hl(n){n=Oe(n,ae);const e=Oe(n.firestore,ht);return UE(bs(e),n._key).then((t=>Td(e,n,t)))}Jt._jsonSchemaVersion="firestore/querySnapshot/1.0",Jt._jsonSchema={type:he("string",Jt._jsonSchemaVersion),bundleSource:he("string","QuerySnapshot"),bundleName:he("string"),bundle:he("string")};class fa extends JE{constructor(e){super(),this.firestore=e}convertBytes(e){return new xe(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new ae(this.firestore,null,t)}}function bt(n){n=Oe(n,on);const e=Oe(n.firestore,ht),t=bs(e),s=new fa(e);return Ed(n._query),FE(t,n._query).then((r=>new Jt(e,s,n,r)))}function Xt(n,e,t,...s){n=Oe(n,ae);const r=Oe(n.firestore,ht),i=ni(r);let a;return a=typeof(e=ie(e))=="string"||e instanceof Ss?md(i,"updateDoc",n._key,e,t,s):fd(i,"updateDoc",n._key,e),oi(r,[a.toMutation(n._key,Ne.exists(!0))])}function ii(n){return oi(Oe(n.firestore,ht),[new Qr(n._key,Ne.none())])}function Cs(n,e){const t=Oe(n.firestore,ht),s=Ee(n),r=vd(n.converter,e);return oi(t,[dd(ni(n.firestore),"addDoc",s._key,r,n.converter!==null,{}).toMutation(s._key,Ne.exists(!1))]).then((()=>s))}function Vn(n,...e){n=ie(n);let t={includeMetadataChanges:!1,source:"default"},s=0;typeof e[s]!="object"||jl(e[s])||(t=e[s++]);const r={includeMetadataChanges:t.includeMetadataChanges,source:t.source};if(jl(e[s])){const u=e[s];e[s]=u.next?.bind(u),e[s+1]=u.error?.bind(u),e[s+2]=u.complete?.bind(u)}let i,a,c;if(n instanceof ae)a=Oe(n.firestore,ht),c=Hr(n._key.path),i={next:u=>{e[s]&&e[s](Td(a,n,u))},error:e[s+1],complete:e[s+2]};else{const u=Oe(n,on);a=Oe(u.firestore,ht),c=u._query;const d=new fa(a);i={next:f=>{e[s]&&e[s](new Jt(a,d,u,f))},error:e[s+1],complete:e[s+2]},Ed(n._query)}return(function(d,f,p,y){const S=new ia(y),P=new na(f,S,p);return d.asyncQueue.enqueueAndForget((async()=>Zo(await br(d),P))),()=>{S.Nu(),d.asyncQueue.enqueueAndForget((async()=>ea(await br(d),P)))}})(bs(a),c,r,i)}function oi(n,e){return(function(s,r){const i=new rt;return s.asyncQueue.enqueueAndForget((async()=>SE(await xE(s),r,i))),i.promise})(bs(n),e)}function Td(n,e,t){const s=t.docs.get(e._key),r=new fa(n);return new Qt(n,r,e._key,s,new Xn(t.hasPendingWrites,t.fromCache),e.converter)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class YE{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=ni(e)}set(e,t,s){this._verifyNotCommitted();const r=Gi(e,this._firestore),i=vd(r.converter,t,s),a=dd(this._dataReader,"WriteBatch.set",r._key,i,r.converter!==null,s);return this._mutations.push(a.toMutation(r._key,Ne.none())),this}update(e,t,s,...r){this._verifyNotCommitted();const i=Gi(e,this._firestore);let a;return a=typeof(t=ie(t))=="string"||t instanceof Ss?md(this._dataReader,"WriteBatch.update",i._key,t,s,r):fd(this._dataReader,"WriteBatch.update",i._key,t),this._mutations.push(a.toMutation(i._key,Ne.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=Gi(e,this._firestore);return this._mutations=this._mutations.concat(new Qr(t._key,Ne.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new N(R.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function Gi(n,e){if((n=ie(n)).firestore!==e)throw new N(R.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return n}function ai(){return new aa("serverTimestamp")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ci(n){return bs(n=Oe(n,ht)),new YE(n,(e=>oi(n,e)))}(function(e,t=!0){(function(r){Rn=r})(nn),Vt(new it("firestore",((s,{instanceIdentifier:r,options:i})=>{const a=s.getProvider("app").getImmediate(),c=new ht(new Gg(s.getProvider("auth-internal")),new Qg(a,s.getProvider("app-check-internal")),(function(d,f){if(!Object.prototype.hasOwnProperty.apply(d.options,["projectId"]))throw new N(R.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new cs(d.options.projectId,f)})(a,r),a);return i={useFetchStreams:t,...i},c._setSettings(i),c}),"PUBLIC").setMultipleInstances(!0)),Fe(zc,Gc,e),Fe(zc,Gc,"esm2020")})();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wd="firebasestorage.googleapis.com",ZE="storageBucket",eI=120*1e3,tI=600*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt extends qe{constructor(e,t,s=0){super(Wi(e),`Firebase Storage: ${t} (${Wi(e)})`),this.status_=s,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,tt.prototype)}get status(){return this.status_}set status(e){this.status_=e}_codeEquals(e){return Wi(e)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(e){this.customData.serverResponse=e,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var et;(function(n){n.UNKNOWN="unknown",n.OBJECT_NOT_FOUND="object-not-found",n.BUCKET_NOT_FOUND="bucket-not-found",n.PROJECT_NOT_FOUND="project-not-found",n.QUOTA_EXCEEDED="quota-exceeded",n.UNAUTHENTICATED="unauthenticated",n.UNAUTHORIZED="unauthorized",n.UNAUTHORIZED_APP="unauthorized-app",n.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",n.INVALID_CHECKSUM="invalid-checksum",n.CANCELED="canceled",n.INVALID_EVENT_NAME="invalid-event-name",n.INVALID_URL="invalid-url",n.INVALID_DEFAULT_BUCKET="invalid-default-bucket",n.NO_DEFAULT_BUCKET="no-default-bucket",n.CANNOT_SLICE_BLOB="cannot-slice-blob",n.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",n.NO_DOWNLOAD_URL="no-download-url",n.INVALID_ARGUMENT="invalid-argument",n.INVALID_ARGUMENT_COUNT="invalid-argument-count",n.APP_DELETED="app-deleted",n.INVALID_ROOT_OPERATION="invalid-root-operation",n.INVALID_FORMAT="invalid-format",n.INTERNAL_ERROR="internal-error",n.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(et||(et={}));function Wi(n){return"storage/"+n}function nI(){const n="An unknown error occurred, please check the error payload for server response.";return new tt(et.UNKNOWN,n)}function sI(){return new tt(et.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function rI(){return new tt(et.CANCELED,"User canceled the upload/download.")}function iI(n){return new tt(et.INVALID_URL,"Invalid URL '"+n+"'.")}function oI(n){return new tt(et.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+n+"'.")}function zl(n){return new tt(et.INVALID_ARGUMENT,n)}function Ad(){return new tt(et.APP_DELETED,"The Firebase app was deleted.")}function aI(n){return new tt(et.INVALID_ROOT_OPERATION,"The operation '"+n+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class je{constructor(e,t){this.bucket=e,this.path_=t}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const e=encodeURIComponent;return"/b/"+e(this.bucket)+"/o/"+e(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(e,t){let s;try{s=je.makeFromUrl(e,t)}catch{return new je(e,"")}if(s.path==="")return s;throw oI(e)}static makeFromUrl(e,t){let s=null;const r="([A-Za-z0-9.\\-_]+)";function i(X){X.path.charAt(X.path.length-1)==="/"&&(X.path_=X.path_.slice(0,-1))}const a="(/(.*))?$",c=new RegExp("^gs://"+r+a,"i"),u={bucket:1,path:3};function d(X){X.path_=decodeURIComponent(X.path)}const f="v[A-Za-z0-9_]+",p=t.replace(/[.]/g,"\\."),y="(/([^?#]*).*)?$",S=new RegExp(`^https?://${p}/${f}/b/${r}/o${y}`,"i"),P={bucket:1,path:3},D=t===wd?"(?:storage.googleapis.com|storage.cloud.google.com)":t,k="([^?#]*)",j=new RegExp(`^https?://${D}/${r}/${k}`,"i"),H=[{regex:c,indices:u,postModify:i},{regex:S,indices:P,postModify:d},{regex:j,indices:{bucket:1,path:2},postModify:d}];for(let X=0;X<H.length;X++){const de=H[X],se=de.regex.exec(e);if(se){const v=se[de.indices.bucket];let g=se[de.indices.path];g||(g=""),s=new je(v,g),de.postModify(s);break}}if(s==null)throw iI(e);return s}}class cI{constructor(e){this.promise_=Promise.reject(e)}getPromise(){return this.promise_}cancel(e=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lI(n,e,t){let s=1,r=null,i=null,a=!1,c=0;function u(){return c===2}let d=!1;function f(...k){d||(d=!0,e.apply(null,k))}function p(k){r=setTimeout(()=>{r=null,n(S,u())},k)}function y(){i&&clearTimeout(i)}function S(k,...j){if(d){y();return}if(k){y(),f.call(null,k,...j);return}if(u()||a){y(),f.call(null,k,...j);return}s<64&&(s*=2);let H;c===1?(c=2,H=0):H=(s+Math.random())*1e3,p(H)}let P=!1;function D(k){P||(P=!0,y(),!d&&(r!==null?(k||(c=2),clearTimeout(r),p(0)):k||(c=1)))}return p(0),i=setTimeout(()=>{a=!0,D(!0)},t),D}function uI(n){n(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hI(n){return n!==void 0}function Gl(n,e,t,s){if(s<e)throw zl(`Invalid value for '${n}'. Expected ${e} or greater.`);if(s>t)throw zl(`Invalid value for '${n}'. Expected ${t} or less.`)}function dI(n){const e=encodeURIComponent;let t="?";for(const s in n)if(n.hasOwnProperty(s)){const r=e(s)+"="+e(n[s]);t=t+r+"&"}return t=t.slice(0,-1),t}var Cr;(function(n){n[n.NO_ERROR=0]="NO_ERROR",n[n.NETWORK_ERROR=1]="NETWORK_ERROR",n[n.ABORT=2]="ABORT"})(Cr||(Cr={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fI(n,e){const t=n>=500&&n<600,r=[408,429].indexOf(n)!==-1,i=e.indexOf(n)!==-1;return t||r||i}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mI{constructor(e,t,s,r,i,a,c,u,d,f,p,y=!0,S=!1){this.url_=e,this.method_=t,this.headers_=s,this.body_=r,this.successCodes_=i,this.additionalRetryCodes_=a,this.callback_=c,this.errorCallback_=u,this.timeout_=d,this.progressCallback_=f,this.connectionFactory_=p,this.retry=y,this.isUsingEmulator=S,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((P,D)=>{this.resolve_=P,this.reject_=D,this.start_()})}start_(){const e=(s,r)=>{if(r){s(!1,new Js(!1,null,!0));return}const i=this.connectionFactory_();this.pendingConnection_=i;const a=c=>{const u=c.loaded,d=c.lengthComputable?c.total:-1;this.progressCallback_!==null&&this.progressCallback_(u,d)};this.progressCallback_!==null&&i.addUploadProgressListener(a),i.send(this.url_,this.method_,this.isUsingEmulator,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&i.removeUploadProgressListener(a),this.pendingConnection_=null;const c=i.getErrorCode()===Cr.NO_ERROR,u=i.getStatus();if(!c||fI(u,this.additionalRetryCodes_)&&this.retry){const f=i.getErrorCode()===Cr.ABORT;s(!1,new Js(!1,null,f));return}const d=this.successCodes_.indexOf(u)!==-1;s(!0,new Js(d,i))})},t=(s,r)=>{const i=this.resolve_,a=this.reject_,c=r.connection;if(r.wasSuccessCode)try{const u=this.callback_(c,c.getResponse());hI(u)?i(u):i()}catch(u){a(u)}else if(c!==null){const u=nI();u.serverResponse=c.getErrorText(),this.errorCallback_?a(this.errorCallback_(c,u)):a(u)}else if(r.canceled){const u=this.appDelete_?Ad():rI();a(u)}else{const u=sI();a(u)}};this.canceled_?t(!1,new Js(!1,null,!0)):this.backoffId_=lI(e,t,this.timeout_)}getPromise(){return this.promise_}cancel(e){this.canceled_=!0,this.appDelete_=e||!1,this.backoffId_!==null&&uI(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Js{constructor(e,t,s){this.wasSuccessCode=e,this.connection=t,this.canceled=!!s}}function pI(n,e){e!==null&&e.length>0&&(n.Authorization="Firebase "+e)}function gI(n,e){n["X-Firebase-Storage-Version"]="webjs/"+(e??"AppManager")}function _I(n,e){e&&(n["X-Firebase-GMPID"]=e)}function yI(n,e){e!==null&&(n["X-Firebase-AppCheck"]=e)}function EI(n,e,t,s,r,i,a=!0,c=!1){const u=dI(n.urlParams),d=n.url+u,f=Object.assign({},n.headers);return _I(f,e),pI(f,t),gI(f,i),yI(f,s),new mI(d,n.method,f,n.body,n.successCodes,n.additionalRetryCodes,n.handler,n.errorHandler,n.timeout,n.progressCallback,r,a,c)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function II(n){if(n.length===0)return null;const e=n.lastIndexOf("/");return e===-1?"":n.slice(0,e)}function vI(n){const e=n.lastIndexOf("/",n.length-2);return e===-1?n:n.slice(e+1)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pr{constructor(e,t){this._service=e,t instanceof je?this._location=t:this._location=je.makeFromUrl(t,e.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(e,t){return new Pr(e,t)}get root(){const e=new je(this._location.bucket,"");return this._newRef(this._service,e)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return vI(this._location.path)}get storage(){return this._service}get parent(){const e=II(this._location.path);if(e===null)return null;const t=new je(this._location.bucket,e);return new Pr(this._service,t)}_throwIfRoot(e){if(this._location.path==="")throw aI(e)}}function Wl(n,e){const t=e?.[ZE];return t==null?null:je.makeFromBucketSpec(t,n)}function TI(n,e,t,s={}){n.host=`${e}:${t}`;const r=dt(e);r&&(Dr(`https://${n.host}/b`),Lr("Storage",!0)),n._isUsingEmulator=!0,n._protocol=r?"https":"http";const{mockUserToken:i}=s;i&&(n._overrideAuthToken=typeof i=="string"?i:cu(i,n.app.options.projectId))}class wI{constructor(e,t,s,r,i,a=!1){this.app=e,this._authProvider=t,this._appCheckProvider=s,this._url=r,this._firebaseVersion=i,this._isUsingEmulator=a,this._bucket=null,this._host=wd,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=eI,this._maxUploadRetryTime=tI,this._requests=new Set,r!=null?this._bucket=je.makeFromBucketSpec(r,this._host):this._bucket=Wl(this._host,this.app.options)}get host(){return this._host}set host(e){this._host=e,this._url!=null?this._bucket=je.makeFromBucketSpec(this._url,e):this._bucket=Wl(e,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(e){Gl("time",0,Number.POSITIVE_INFINITY,e),this._maxUploadRetryTime=e}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(e){Gl("time",0,Number.POSITIVE_INFINITY,e),this._maxOperationRetryTime=e}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const e=this._authProvider.getImmediate({optional:!0});if(e){const t=await e.getToken();if(t!==null)return t.accessToken}return null}async _getAppCheckToken(){if(Le(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=this._appCheckProvider.getImmediate({optional:!0});return e?(await e.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(e=>e.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(e){return new Pr(this,e)}_makeRequest(e,t,s,r,i=!0){if(this._deleted)return new cI(Ad());{const a=EI(e,this._appId,s,r,t,this._firebaseVersion,i,this._isUsingEmulator);return this._requests.add(a),a.getPromise().then(()=>this._requests.delete(a),()=>this._requests.delete(a)),a}}async makeRequestWithTokens(e,t){const[s,r]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(e,t,s,r).getPromise()}}const Kl="@firebase/storage",Ql="0.14.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bd="storage";function AI(n=Mr(),e){n=ie(n);const s=ps(n,bd).getImmediate({identifier:e}),r=To("storage");return r&&bI(s,...r),s}function bI(n,e,t,s={}){TI(n,e,t,s)}function SI(n,{instanceIdentifier:e}){const t=n.getProvider("app").getImmediate(),s=n.getProvider("auth-internal"),r=n.getProvider("app-check-internal");return new wI(t,s,r,e,nn)}function RI(){Vt(new it(bd,SI,"PUBLIC").setMultipleInstances(!0)),Fe(Kl,Ql,""),Fe(Kl,Ql,"esm2020")}RI();const M=(n,e=!0)=>{const t=document.getElementById("toast-notification"),s=document.getElementById("toast-message");!t||!s||(s.textContent=n,t.style.backgroundColor=e?"#ef4444":"#22c55e",t.classList.remove("opacity-0","translate-x-[120%]"),setTimeout(()=>{t.classList.add("opacity-0","translate-x-[120%]")},3e3))},CI={apiKey:"AIzaSyBWD__2wEy7dkZ40-UBMLik-acqPJ4wpEY",authDomain:"svcm-v2.firebaseapp.com",projectId:"svcm-v2",storageBucket:"svcm-v2.firebasestorage.app",messagingSenderId:"189740450655",appId:"1:189740450655:web:a7bf1b03d23352a09b2cea"},li=hu(CI),PI=$g(li),q=jE(li);AI(li);const kI={init(n){this.app=n,this.app.elements.addSubjectBtn.addEventListener("click",()=>this.addNewSubject()),this.listenForSubjects()},async addNewSubject(){const n=this.app.elements.newSubjectNameInput.value.trim();if(!n){M("과목 이름을 입력해주세요.");return}try{await Cs(le(q,"subjects"),{name:n,createdAt:ai()}),M("새로운 공통 과목이 추가되었습니다.",!1),this.app.elements.newSubjectNameInput.value=""}catch(e){console.error("과목 추가 실패:",e),M("과목 추가에 실패했습니다.")}},listenForSubjects(){const n=Ue(le(q,"subjects"));Vn(n,e=>{const t=[];e.forEach(s=>t.push({id:s.id,...s.data()})),t.sort((s,r)=>(s.createdAt?.toMillis()||0)-(r.createdAt?.toMillis()||0)),this.app.state.subjects=t,this.renderSubjectList(),document.dispatchEvent(new CustomEvent("subjectsUpdated"))})},renderSubjectList(){const{subjectsList:n,subjects:e}=this.app.elements;if(n.innerHTML="",this.app.state.subjects.length===0){n.innerHTML='<p class="text-sm text-slate-400">생성된 과목이 없습니다.</p>';return}this.app.state.subjects.forEach(t=>{const s=document.createElement("div");s.className="p-3 border rounded-lg flex items-center justify-between",s.innerHTML=`<span class="font-medium text-slate-700">${t.name}</span> <button data-id="${t.id}" class="delete-subject-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`,n.appendChild(s),s.querySelector(".delete-subject-btn").addEventListener("click",r=>this.deleteSubject(r.target.dataset.id))})},async deleteSubject(n){if(confirm("정말로 이 과목을 삭제하시겠습니까? 과목에 속한 모든 학습, 교재 정보가 사라지고, 각 반에서 이 과목이 제외됩니다."))try{const e=ci(q),t=le(q,"subjects",n,"lessons");(await bt(t)).forEach(d=>e.delete(d.ref));const r=le(q,"subjects",n,"textbooks");(await bt(r)).forEach(d=>e.delete(d.ref));const a=Ue(le(q,"classes"));(await bt(a)).forEach(d=>{const f=d.data();if(f.subjects&&f.subjects[n]){const p={...f.subjects};delete p[n],e.update(d.ref,{subjects:p})}});const u=Ee(q,"subjects",n);e.delete(u),await e.commit(),M("과목과 관련된 모든 데이터가 정리되었습니다.",!1)}catch(e){console.error("과목 삭제 실패:",e),M("과목 삭제에 실패했습니다.")}}},VI={init(n){this.app=n,this.app.elements.subjectSelectForTextbook.addEventListener("change",e=>this.handleSubjectSelectForTextbook(e.target.value)),this.app.elements.addTextbookBtn.addEventListener("click",()=>this.addNewTextbook())},handleSubjectSelectForTextbook(n){this.app.state.selectedSubjectIdForTextbook=n,n?(this.app.elements.textbookManagementContent.style.display="block",this.listenForTextbooks()):(this.app.elements.textbookManagementContent.style.display="none",this.app.elements.textbooksList.innerHTML='<p class="text-sm text-slate-400">먼저 과목을 선택해주세요.</p>')},listenForTextbooks(){const n=this.app.state.selectedSubjectIdForTextbook;if(!n)return;const e=Ue(le(q,`subjects/${n}/textbooks`));Vn(e,t=>{const s=[];t.forEach(r=>s.push({id:r.id,...r.data()})),this.renderTextbookList(s)})},renderTextbookList(n){const e=this.app.elements.textbooksList;if(e.innerHTML="",n.length===0){e.innerHTML='<p class="text-sm text-slate-400">등록된 교재가 없습니다.</p>';return}n.forEach(t=>{const s=document.createElement("div");s.className="p-3 border rounded-lg flex items-center justify-between",s.innerHTML=`<span class="font-medium text-slate-700">${t.name}</span> <button data-id="${t.id}" class="delete-textbook-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`,e.appendChild(s),s.querySelector(".delete-textbook-btn").addEventListener("click",r=>this.deleteTextbook(r.target.dataset.id))})},async addNewTextbook(){const n=this.app.state.selectedSubjectIdForTextbook,e=this.app.elements.newTextbookNameInput.value.trim();if(!n){M("먼저 과목을 선택해주세요.");return}if(!e){M("교재 이름을 입력해주세요.");return}try{await Cs(le(q,`subjects/${n}/textbooks`),{name:e}),M("새 교재가 추가되었습니다.",!1),this.app.elements.newTextbookNameInput.value=""}catch{M("교재 추가에 실패했습니다.")}},async deleteTextbook(n){const e=this.app.state.selectedSubjectIdForTextbook;if(confirm("정말로 이 교재를 삭제하시겠습니까?"))try{await ii(Ee(q,`subjects/${e}/textbooks`,n)),M("교재가 삭제되었습니다.",!1)}catch{M("교재 삭제에 실패했습니다.")}}},NI={init(n){this.app=n,this.app.elements.addClassBtn.addEventListener("click",()=>this.addNewClass()),this.app.elements.closeEditClassModalBtn?.addEventListener("click",()=>this.closeEditClassModal()),this.app.elements.cancelEditClassBtn?.addEventListener("click",()=>this.closeEditClassModal()),this.app.elements.saveClassEditBtn?.addEventListener("click",()=>this.saveClassChanges()),this.listenForClasses()},async addNewClass(){const{newClassNameInput:n}=this.app.elements,e=n.value.trim();if(!e){M("반 이름을 입력해주세요.");return}try{await Cs(le(q,"classes"),{name:e,subjects:{},classType:"self-directed",createdAt:ai()}),M("새로운 반이 추가되었습니다. '수정' 버튼으로 과목, 학생, 반 특성을 설정하세요.",!1),n.value=""}catch(t){console.error("반 추가 실패:",t),M("반 추가에 실패했습니다.")}},listenForClasses(){const n=Ue(le(q,"classes"));Vn(n,e=>{const t=[];e.forEach(s=>t.push({id:s.id,...s.data()})),t.sort((s,r)=>s.name.localeCompare(r.name)),this.app.state.classes=t,this.renderClassList(),document.dispatchEvent(new CustomEvent("classesUpdated"))})},renderClassList(){const{classesList:n}=this.app.elements,{subjects:e}=this.app.state;if(n.innerHTML="",!this.app.state.classes||this.app.state.classes.length===0){n.innerHTML='<p class="text-sm text-slate-400">생성된 반이 없습니다.</p>';return}this.app.state.classes.forEach(t=>{const s=document.createElement("div"),i=(t.subjects?Object.keys(t.subjects):[]).map(c=>e.find(u=>u.id===c)?.name).filter(Boolean).join(", "),a=t.classType==="live-lecture"?"현강반":"자기주도반";s.className="p-3 border rounded-lg",s.innerHTML=`
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-medium text-slate-700">${t.name}</span>
                        <span class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-2">${a}</span> </div>
                    <div class="flex items-center gap-2">
                        <button data-id="${t.id}" class="edit-class-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                        <button data-id="${t.id}" class="delete-class-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mt-1">연결된 과목: ${i||"없음"}</p>
            `,n.appendChild(s),s.querySelector(".delete-class-btn").addEventListener("click",c=>this.deleteClass(c.target.dataset.id)),s.querySelector(".edit-class-btn").addEventListener("click",c=>this.openEditClassModal(c.target.dataset.id))})},async deleteClass(n){if(confirm("정말로 이 반을 삭제하시겠습니까? 소속된 학생들은 '미배정' 상태가 됩니다."))try{const e=ci(q),t=Ee(q,"classes",n);e.delete(t);const s=Ue(le(q,"students"),Rr("classId","==",n));(await bt(s)).forEach(c=>{e.update(c.ref,{classId:null})});const i=Ue(le(q,"classLectures"),Rr("classId","==",n));(await bt(i)).forEach(c=>{e.delete(c.ref)}),await e.commit(),M("반이 삭제되고 관련 데이터(학생 배정 해제, 수업 영상)가 정리되었습니다.",!1)}catch(e){console.error("반 삭제 실패:",e),M("반 삭제에 실패했습니다.")}},async openEditClassModal(n){const e=this.app.state.classes.find(c=>c.id===n);if(!e)return;this.app.state.editingClass=e;const t=document.getElementById("admin-edit-class-name"),s=document.getElementById("admin-edit-class-subjects-and-textbooks"),r=document.getElementById("admin-edit-class-modal"),i=document.getElementById("admin-edit-class-students-container"),a=document.getElementById("admin-edit-class-type");if(!t||!s||!r||!i||!a){console.error("필수 모달 요소 중 일부를 찾을 수 없습니다.");return}t.textContent=e.name,a.value=e.classType||"self-directed",s.innerHTML="과목 정보 불러오는 중...",i.innerHTML="학생 정보 불러오는 중...",document.body.classList.add("modal-open"),r.style.display="flex",this.renderSubjectsForEditing(e,s),this.renderStudentsForEditing(n,i)},async renderSubjectsForEditing(n,e){const t=n.subjects||{},s=this.app.state.subjects.map(a=>bt(le(q,`subjects/${a.id}/textbooks`))),r=await Promise.all(s),i={};this.app.state.subjects.forEach((a,c)=>{i[a.id]=r[c].docs.map(u=>({id:u.id,...u.data()}))}),e.innerHTML="",this.app.state.subjects.forEach(a=>{const c=t.hasOwnProperty(a.id),u=c?new Set(t[a.id].textbooks):new Set,d=document.createElement("div");d.className="p-3 border rounded-lg";let f='<div class="pl-6 mt-2 space-y-1">';i[a.id].forEach(p=>{f+=`
                    <div>
                        <input type="checkbox" id="textbook-${p.id}" data-subject-id="${a.id}" data-textbook-id="${p.id}" class="textbook-checkbox" ${u.has(p.id)?"checked":""}>
                        <label for="textbook-${p.id}" class="ml-2 text-sm">${p.name}</label>
                    </div>`}),f+="</div>",d.innerHTML=`
                <div class="font-semibold">
                    <input type="checkbox" id="subject-${a.id}" data-subject-id="${a.id}" class="subject-checkbox" ${c?"checked":""}>
                    <label for="subject-${a.id}" class="ml-2">${a.name}</label>
                </div>
                ${i[a.id].length>0?f:""}
            `,e.appendChild(d)})},async renderStudentsForEditing(n,e){const s=(await bt(Ue(le(q,"students")))).docs.map(f=>({id:f.id,...f.data()})),r=s.filter(f=>f.classId===n).sort((f,p)=>f.name.localeCompare(p.name)),i=s.filter(f=>!f.classId||f.classId!==n).sort((f,p)=>f.name.localeCompare(p.name));e.innerHTML=`
            <div>
                <h4 class="font-semibold text-slate-700 mb-2">소속 학생 (${r.length}명)</h4>
                <div id="admin-students-in-class-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border p-2 rounded-md"></div>
            </div>
            <div>
                <h4 class="font-semibold text-slate-700 mb-2">학생 추가</h4>
                <input type="text" id="admin-student-search-input" class="w-full px-3 py-2 border rounded-lg mb-2" placeholder="이름 또는 전화번호로 검색">
                <div id="admin-students-not-in-class-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border p-2 rounded-md"></div>
            </div>
        `;const a=e.querySelector("#admin-students-in-class-list"),c=e.querySelector("#admin-students-not-in-class-list"),u=e.querySelector("#admin-student-search-input"),d=(f="")=>{a.innerHTML="",c.innerHTML="",r.length===0?a.innerHTML='<p class="text-sm text-slate-400">소속된 학생이 없습니다.</p>':r.forEach(y=>{const S=document.createElement("div");S.className="p-2 bg-slate-50 rounded-md flex justify-between items-center",S.innerHTML=`
                        <span class="text-sm">${y.name} (${y.phone||"번호없음"})</span>
                        <button data-id="${y.id}" class="remove-student-btn text-red-500 text-xs font-bold">제외</button>
                    `,a.appendChild(S),S.querySelector(".remove-student-btn").addEventListener("click",async P=>{await Xt(Ee(q,"students",P.target.dataset.id),{classId:null}),M(`${y.name} 학생을 반에서 제외했습니다.`,!1),this.renderStudentsForEditing(n,e)})});const p=i.filter(y=>y.name.toLowerCase().includes(f.toLowerCase())||y.phone&&y.phone.includes(f));p.length===0?c.innerHTML='<p class="text-sm text-slate-400">추가할 학생이 없거나 검색 결과가 없습니다.</p>':p.forEach(y=>{const S=document.createElement("div");S.className="p-2 bg-slate-50 rounded-md flex justify-between items-center";const P=y.classId?this.app.state.classes.find(D=>D.id===y.classId)?.name:"미배정";S.innerHTML=`
                         <div>
                            <span class="text-sm">${y.name} (${y.phone||"번호없음"})</span>
                            <span class="text-xs text-slate-400 ml-1">[${P}]</span>
                         </div>
                        <button data-id="${y.id}" class="add-student-btn text-blue-500 text-xs font-bold">추가</button>
                    `,c.appendChild(S),S.querySelector(".add-student-btn").addEventListener("click",async D=>{await Xt(Ee(q,"students",D.target.dataset.id),{classId:n}),M(`${y.name} 학생을 반에 추가했습니다.`,!1),this.renderStudentsForEditing(n,e)})})};u?.addEventListener("input",f=>d(f.target.value.trim())),d()},closeEditClassModal(){this.app.state.editingClass=null,document.body.classList.remove("modal-open");const n=document.getElementById("admin-edit-class-modal");n&&(n.style.display="none")},async saveClassChanges(){if(!this.app.state.editingClass)return;const n=this.app.state.editingClass.id,e={},t=document.getElementById("admin-edit-class-type");if(!t){console.error("반 유형 선택 요소를 찾을 수 없습니다.");return}const s=t.value;document.querySelectorAll("#admin-edit-class-modal .subject-checkbox:checked").forEach(i=>{const a=i.dataset.subjectId,c=document.querySelectorAll(`#admin-edit-class-modal .textbook-checkbox[data-subject-id="${a}"]:checked`),u=Array.from(c).map(d=>d.dataset.textbookId);e[a]={textbooks:u}});try{await Xt(Ee(q,"classes",n),{subjects:e,classType:s}),M("반 정보(과목/교재/유형)가 성공적으로 수정되었습니다.",!1),this.closeEditClassModal()}catch(i){console.error("반 정보 수정 실패:",i),M("반 정보 수정에 실패했습니다.")}}},DI={editingStudentId:null,init(n){this.app=n,this.elements={newStudentNameInput:document.getElementById("admin-new-student-name"),newStudentPhoneInput:document.getElementById("admin-new-student-phone"),newParentPhoneInput:document.getElementById("admin-new-parent-phone"),addStudentBtn:document.getElementById("admin-add-student-btn"),studentsList:document.getElementById("admin-students-list"),editStudentModal:document.getElementById("admin-edit-student-modal"),closeEditStudentModalBtn:document.getElementById("admin-close-edit-student-modal-btn"),cancelEditStudentBtn:document.getElementById("admin-cancel-edit-student-btn"),saveStudentEditBtn:document.getElementById("admin-save-student-edit-btn"),editStudentNameInput:document.getElementById("admin-edit-student-name"),editStudentPhoneInput:document.getElementById("admin-edit-student-phone"),editParentPhoneInput:document.getElementById("admin-edit-parent-phone")},this.elements.addStudentBtn?.addEventListener("click",()=>this.addNewStudent()),this.elements.closeEditStudentModalBtn?.addEventListener("click",()=>this.closeEditStudentModal()),this.elements.cancelEditStudentBtn?.addEventListener("click",()=>this.closeEditStudentModal()),this.elements.saveStudentEditBtn?.addEventListener("click",()=>this.saveStudentChanges()),this.listenForStudents()},async addNewStudent(){const n=this.elements.newStudentNameInput,e=this.elements.newStudentPhoneInput,t=this.elements.newParentPhoneInput,s=n.value.trim(),r=e.value.trim(),i=t.value.trim();if(!s||!r){M("학생 이름과 학생 전화번호는 필수입니다.");return}if(!/^\d+$/.test(r)||r.length<4){M("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");return}if(i&&!/^\d+$/.test(i)){M("부모님 전화번호는 숫자만 입력해주세요.");return}const a=r.slice(-4);try{await Cs(le(q,"students"),{name:s,password:a,phone:r,parentPhone:i||null,classId:null,createdAt:ai(),isInitialPassword:!0}),M(`새로운 학생 ${s} 추가됨 (비밀번호: ${a})`,!1),n.value="",e.value="",t.value=""}catch(c){console.error("학생 추가 실패:",c),M("학생 추가 실패.")}},listenForStudents(){const n=this.elements.studentsList;if(!n)return;const e=Ue(le(q,"students"));Vn(e,t=>{if(n.innerHTML="",t.empty){n.innerHTML='<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';return}const s=[];t.forEach(a=>s.push({id:a.id,...a.data()})),s.sort((a,c)=>a.name.localeCompare(c.name));const r=s.filter(a=>a.classId),i=s.filter(a=>!a.classId);n.innerHTML+='<h4 class="text-md font-semibold text-slate-600 mt-4">미배정 학생</h4>',i.length===0?n.innerHTML+='<p class="text-sm text-slate-400">미배정 학생이 없습니다.</p>':i.forEach(a=>this.renderStudent(a)),n.innerHTML+='<h4 class="text-md font-semibold text-slate-600 mt-6">반 배정된 학생</h4>',r.length===0?n.innerHTML+='<p class="text-sm text-slate-400">반 배정된 학생이 없습니다.</p>':r.forEach(a=>this.renderStudent(a))})},renderStudent(n){const e=this.elements.studentsList;if(!e)return;const t=document.createElement("div"),s=this.app?.state?.classes?.find(i=>i.id===n.classId)?.name||"미배정",r=n.parentPhone?`<p class="text-xs text-slate-500">보호자: ${n.parentPhone}</p>`:"";t.className="p-3 border rounded-lg flex items-center justify-between",t.innerHTML=`
            <div>
                <span class="font-medium text-slate-700">${n.name} (${n.phone||"번호없음"})</span>
                <span class="text-xs text-slate-500 ml-2">[${s}]</span>
                ${r} </div>
            <div class="flex gap-2 flex-shrink-0"> <button data-id="${n.id}" class="edit-student-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${n.id}" data-name="${n.name}" class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${n.id}" class="delete-student-btn text-red-500 hover:red-blue-700 text-sm font-semibold">삭제</button>
            </div>
        `,e.appendChild(t),t.querySelector(".edit-student-btn")?.addEventListener("click",i=>{this.openEditStudentModal(i.target.dataset.id)}),t.querySelector(".delete-student-btn")?.addEventListener("click",async i=>{if(confirm(`'${n.name}' 학생을 정말 삭제하시겠습니까?`))try{await ii(Ee(q,"students",i.target.dataset.id)),M("학생 삭제 완료.",!1)}catch(a){console.error("학생 삭제 실패:",a),M("학생 삭제 실패.")}}),t.querySelector(".reset-password-btn")?.addEventListener("click",i=>{this.resetStudentPassword(i.target.dataset.id,i.target.dataset.name)})},async openEditStudentModal(n){if(this.editingStudentId=n,!!n)try{const e=Ee(q,"students",n),t=await Hl(e);if(t.exists()){const s=t.data();this.elements.editStudentNameInput&&(this.elements.editStudentNameInput.value=s.name||""),this.elements.editStudentPhoneInput&&(this.elements.editStudentPhoneInput.value=s.phone||""),this.elements.editParentPhoneInput&&(this.elements.editParentPhoneInput.value=s.parentPhone||""),this.elements.editStudentModal&&(this.elements.editStudentModal.style.display="flex"),document.body.classList.add("modal-open")}else M("학생 정보를 찾을 수 없습니다."),this.editingStudentId=null}catch(e){console.error("학생 정보 로딩 실패:",e),M("학생 정보 로딩 실패."),this.editingStudentId=null}},closeEditStudentModal(){this.editingStudentId=null,this.elements.editStudentModal&&(this.elements.editStudentModal.style.display="none"),document.body.classList.remove("modal-open")},async saveStudentChanges(){if(!this.editingStudentId)return;const n=this.elements.editStudentNameInput.value.trim(),e=this.elements.editStudentPhoneInput.value.trim(),t=this.elements.editParentPhoneInput.value.trim();if(!n||!e){M("이름과 학생 전화번호는 필수입니다.");return}if(!/^\d+$/.test(e)||e.length<4){M("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");return}if(t&&!/^\d+$/.test(t)){M("부모님 전화번호는 숫자만 입력해주세요.");return}const s=e.slice(-4),r={name:n,phone:e,parentPhone:t||null,password:s,isInitialPassword:!0};try{const i=Ee(q,"students",this.editingStudentId);await Xt(i,r),M("학생 정보가 성공적으로 수정되었습니다.",!1),this.closeEditStudentModal()}catch(i){console.error("학생 정보 수정 실패:",i),M("학생 정보 수정 실패.")}},async resetStudentPassword(n,e){if(confirm(`'${e}' 학생의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`))try{const t=Ee(q,"students",n),s=await Hl(t);if(s.exists()){const r=s.data().phone;if(r&&r.length>=4){const i=r.slice(-4);await Xt(t,{password:i,isInitialPassword:!0}),M(`'${e}' 비밀번호 '${i}'로 초기화 완료.`,!1)}else M("전화번호 정보가 올바르지 않아 초기화 불가.")}}catch(t){console.error("비밀번호 초기화 실패:",t),M("비밀번호 초기화 실패.")}}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const LI="type.googleapis.com/google.protobuf.Int64Value",MI="type.googleapis.com/google.protobuf.UInt64Value";function Sd(n,e){const t={};for(const s in n)n.hasOwnProperty(s)&&(t[s]=e(n[s]));return t}function kr(n){if(n==null)return null;if(n instanceof Number&&(n=n.valueOf()),typeof n=="number"&&isFinite(n)||n===!0||n===!1||Object.prototype.toString.call(n)==="[object String]")return n;if(n instanceof Date)return n.toISOString();if(Array.isArray(n))return n.map(e=>kr(e));if(typeof n=="function"||typeof n=="object")return Sd(n,e=>kr(e));throw new Error("Data cannot be encoded in JSON: "+n)}function bn(n){if(n==null)return n;if(n["@type"])switch(n["@type"]){case LI:case MI:{const e=Number(n.value);if(isNaN(e))throw new Error("Data cannot be decoded from JSON: "+n);return e}default:throw new Error("Data cannot be decoded from JSON: "+n)}return Array.isArray(n)?n.map(e=>bn(e)):typeof n=="function"||typeof n=="object"?Sd(n,e=>bn(e)):n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ma="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jl={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class Ve extends qe{constructor(e,t,s){super(`${ma}/${e}`,t||""),this.details=s,Object.setPrototypeOf(this,Ve.prototype)}}function OI(n){if(n>=200&&n<300)return"ok";switch(n){case 0:return"internal";case 400:return"invalid-argument";case 401:return"unauthenticated";case 403:return"permission-denied";case 404:return"not-found";case 409:return"aborted";case 429:return"resource-exhausted";case 499:return"cancelled";case 500:return"internal";case 501:return"unimplemented";case 503:return"unavailable";case 504:return"deadline-exceeded"}return"unknown"}function Vr(n,e){let t=OI(n),s=t,r;try{const i=e&&e.error;if(i){const a=i.status;if(typeof a=="string"){if(!Jl[a])return new Ve("internal","internal");t=Jl[a],s=a}const c=i.message;typeof c=="string"&&(s=c),r=i.details,r!==void 0&&(r=bn(r))}}catch{}return t==="ok"?null:new Ve(t,s,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xI{constructor(e,t,s,r){this.app=e,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,Le(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.auth=t.getImmediate({optional:!0}),this.messaging=s.getImmediate({optional:!0}),this.auth||t.get().then(i=>this.auth=i,()=>{}),this.messaging||s.get().then(i=>this.messaging=i,()=>{}),this.appCheck||r?.get().then(i=>this.appCheck=i,()=>{})}async getAuthToken(){if(this.auth)try{return(await this.auth.getToken())?.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(e){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const t=e?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return t.error?null:t.token}return null}async getContext(e){const t=await this.getAuthToken(),s=await this.getMessagingToken(),r=await this.getAppCheckToken(e);return{authToken:t,messagingToken:s,appCheckToken:r}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vo="us-central1",UI=/^data: (.*?)(?:\n|$)/;function FI(n){let e=null;return{promise:new Promise((t,s)=>{e=setTimeout(()=>{s(new Ve("deadline-exceeded","deadline-exceeded"))},n)}),cancel:()=>{e&&clearTimeout(e)}}}class BI{constructor(e,t,s,r,i=vo,a=(...c)=>fetch(...c)){this.app=e,this.fetchImpl=a,this.emulatorOrigin=null,this.contextProvider=new xI(e,t,s,r),this.cancelAllRequests=new Promise(c=>{this.deleteService=()=>Promise.resolve(c())});try{const c=new URL(i);this.customDomain=c.origin+(c.pathname==="/"?"":c.pathname),this.region=vo}catch{this.customDomain=null,this.region=i}}_delete(){return this.deleteService()}_url(e){const t=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${t}/${this.region}/${e}`:this.customDomain!==null?`${this.customDomain}/${e}`:`https://${this.region}-${t}.cloudfunctions.net/${e}`}}function jI(n,e,t){const s=dt(e);n.emulatorOrigin=`http${s?"s":""}://${e}:${t}`,s&&(Dr(n.emulatorOrigin+"/backends"),Lr("Functions",!0))}function $I(n,e,t){const s=r=>HI(n,e,r,{});return s.stream=(r,i)=>GI(n,e,r,i),s}function Rd(n){return n.emulatorOrigin&&dt(n.emulatorOrigin)?"include":void 0}async function qI(n,e,t,s,r){t["Content-Type"]="application/json";let i;try{i=await s(n,{method:"POST",body:JSON.stringify(e),headers:t,credentials:Rd(r)})}catch{return{status:0,json:null}}let a=null;try{a=await i.json()}catch{}return{status:i.status,json:a}}async function Cd(n,e){const t={},s=await n.contextProvider.getContext(e.limitedUseAppCheckTokens);return s.authToken&&(t.Authorization="Bearer "+s.authToken),s.messagingToken&&(t["Firebase-Instance-ID-Token"]=s.messagingToken),s.appCheckToken!==null&&(t["X-Firebase-AppCheck"]=s.appCheckToken),t}function HI(n,e,t,s){const r=n._url(e);return zI(n,r,t,s)}async function zI(n,e,t,s){t=kr(t);const r={data:t},i=await Cd(n,s),a=s.timeout||7e4,c=FI(a),u=await Promise.race([qI(e,r,i,n.fetchImpl,n),c.promise,n.cancelAllRequests]);if(c.cancel(),!u)throw new Ve("cancelled","Firebase Functions instance was deleted.");const d=Vr(u.status,u.json);if(d)throw d;if(!u.json)throw new Ve("internal","Response is not valid JSON object.");let f=u.json.data;if(typeof f>"u"&&(f=u.json.result),typeof f>"u")throw new Ve("internal","Response is missing data field.");return{data:bn(f)}}function GI(n,e,t,s){const r=n._url(e);return WI(n,r,t,s||{})}async function WI(n,e,t,s){t=kr(t);const r={data:t},i=await Cd(n,s);i["Content-Type"]="application/json",i.Accept="text/event-stream";let a;try{a=await n.fetchImpl(e,{method:"POST",body:JSON.stringify(r),headers:i,signal:s?.signal,credentials:Rd(n)})}catch(y){if(y instanceof Error&&y.name==="AbortError"){const P=new Ve("cancelled","Request was cancelled.");return{data:Promise.reject(P),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(P)}}}}}}const S=Vr(0,null);return{data:Promise.reject(S),stream:{[Symbol.asyncIterator](){return{next(){return Promise.reject(S)}}}}}}let c,u;const d=new Promise((y,S)=>{c=y,u=S});s?.signal?.addEventListener("abort",()=>{const y=new Ve("cancelled","Request was cancelled.");u(y)});const f=a.body.getReader(),p=KI(f,c,u,s?.signal);return{stream:{[Symbol.asyncIterator](){const y=p.getReader();return{async next(){const{value:S,done:P}=await y.read();return{value:S,done:P}},async return(){return await y.cancel(),{done:!0,value:void 0}}}}},data:d}}function KI(n,e,t,s){const r=(a,c)=>{const u=a.match(UI);if(!u)return;const d=u[1];try{const f=JSON.parse(d);if("result"in f){e(bn(f.result));return}if("message"in f){c.enqueue(bn(f.message));return}if("error"in f){const p=Vr(0,f);c.error(p),t(p);return}}catch(f){if(f instanceof Ve){c.error(f),t(f);return}}},i=new TextDecoder;return new ReadableStream({start(a){let c="";return u();async function u(){if(s?.aborted){const d=new Ve("cancelled","Request was cancelled");return a.error(d),t(d),Promise.resolve()}try{const{value:d,done:f}=await n.read();if(f){c.trim()&&r(c.trim(),a),a.close();return}if(s?.aborted){const y=new Ve("cancelled","Request was cancelled");a.error(y),t(y),await n.cancel();return}c+=i.decode(d,{stream:!0});const p=c.split(`
`);c=p.pop()||"";for(const y of p)y.trim()&&r(y.trim(),a);return u()}catch(d){const f=d instanceof Ve?d:Vr(0,null);a.error(f),t(f)}}},cancel(){return n.cancel()}})}const Xl="@firebase/functions",Yl="0.13.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const QI="auth-internal",JI="app-check-internal",XI="messaging-internal";function YI(n){const e=(t,{instanceIdentifier:s})=>{const r=t.getProvider("app").getImmediate(),i=t.getProvider(QI),a=t.getProvider(XI),c=t.getProvider(JI);return new BI(r,i,a,c,s)};Vt(new it(ma,e,"PUBLIC").setMultipleInstances(!0)),Fe(Xl,Yl,n),Fe(Xl,Yl,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ZI(n=Mr(),e=vo){const s=ps(ie(n),ma).getImmediate({identifier:e}),r=To("functions");return r&&ev(s,...r),s}function ev(n,e,t){jI(ie(n),e,t)}function tv(n,e,t){return $I(ie(n),e)}YI();const nv=ZI(li,"asia-northeast3"),Zl=tv(nv,"createOrUpdateTeacher"),sv={editingTeacherId:null,init(n){this.app=n,this.app.elements.addTeacherBtn.addEventListener("click",()=>this.addNewTeacher()),this.app.elements.closeEditTeacherModalBtn.addEventListener("click",()=>this.closeEditTeacherModal()),this.app.elements.cancelEditTeacherBtn.addEventListener("click",()=>this.closeEditTeacherModal()),this.app.elements.saveTeacherEditBtn.addEventListener("click",()=>this.saveTeacherChanges()),this.listenForTeachers()},async addNewTeacher(){const{newTeacherNameInput:n,newTeacherEmailInput:e,newTeacherPhoneInput:t}=this.app.elements,s=n.value.trim(),r=e.value.trim(),i=t.value.trim();if(!s||!r||!i){M("이름, 이메일, 전화번호를 모두 입력해주세요.");return}try{const a=await Zl({name:s,email:r,phone:i});M(a.data.message,!1),n.value="",e.value="",t.value=""}catch(a){console.error("교사 추가 실패:",a),M(`교사 추가 실패: ${a.message}`)}},listenForTeachers(){const n=Ue(le(q,"teachers"));Vn(n,e=>{const t=this.app.elements.teachersList;if(t.innerHTML="",e.empty){t.innerHTML='<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>';return}const s=[];e.forEach(r=>s.push({id:r.id,...r.data()})),s.sort((r,i)=>r.name.localeCompare(i.name)),this.app.state.teachers=s,s.forEach(r=>this.renderTeacher(r))})},renderTeacher(n){const e=document.createElement("div");e.className="p-3 border rounded-lg flex items-center justify-between";const t=n.email?`(${n.email})`:"(이메일 미등록)";e.innerHTML=`
            <div>
                <p class="font-medium text-slate-700">${n.name} ${t}</p>
                <p class="text-xs text-slate-500">${n.phone||"번호없음"}</p>
            </div>
            <div class="flex gap-2">
                <button data-id="${n.id}" class="edit-teacher-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${n.id}" data-name="${n.name}" class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${n.id}" class="delete-teacher-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
            </div>
        `,this.app.elements.teachersList.appendChild(e),e.querySelector(".edit-teacher-btn").addEventListener("click",s=>{this.openEditTeacherModal(s.target.dataset.id)}),e.querySelector(".delete-teacher-btn").addEventListener("click",async s=>{confirm(`'${n.name}' 교사를 정말 삭제하시겠습니까? (연결된 로그인 계정도 삭제됩니다)`)&&(await ii(Ee(q,"teachers",s.target.dataset.id)),M("교사 정보가 삭제되었습니다. 연결된 계정은 별도 삭제가 필요할 수 있습니다.",!1))}),e.querySelector(".reset-password-btn").addEventListener("click",s=>{this.resetTeacherPassword(s.target.dataset.id,s.target.dataset.name)})},openEditTeacherModal(n){const e=this.app.state.teachers.find(t=>t.id===n);if(!e){M("교사 정보를 찾을 수 없습니다.");return}this.editingTeacherId=n,this.app.elements.editTeacherNameInput.value=e.name,this.app.elements.editTeacherEmailInput.value=e.email||"",this.app.elements.editTeacherPhoneInput.value=e.phone,this.app.elements.editTeacherModal.style.display="flex"},closeEditTeacherModal(){this.editingTeacherId=null,this.app.elements.editTeacherModal.style.display="none"},async saveTeacherChanges(){if(!this.editingTeacherId)return;const n=this.app.elements.editTeacherNameInput.value.trim(),e=this.app.elements.editTeacherEmailInput.value.trim(),t=this.app.elements.editTeacherPhoneInput.value.trim();if(!n||!t){M("이름과 전화번호는 필수입니다.");return}try{const s=await Zl({teacherId:this.editingTeacherId,name:n,email:e,phone:t});M(s.data.message,!1),this.closeEditTeacherModal()}catch(s){console.error("교사 정보 수정 실패:",s),M(`정보 수정 실패: ${s.message}`)}},async resetTeacherPassword(n,e){confirm(`'${e}' 교사의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`)&&M("비밀번호 초기화 기능은 아직 구현되지 않았습니다.")}};function rv(n){const{app:e,elements:t}=n;return{init(){document.getElementById(t.subjectSelectForMgmt)?.addEventListener("change",r=>{e.state.selectedSubjectIdForMgmt=r.target.value,this.handleLessonFilterChange()}),document.getElementById(t.showNewLessonModalBtn)?.addEventListener("click",()=>this.openLessonModalForCreate()),document.getElementById(t.closeModalBtn)?.addEventListener("click",()=>this.hideModal()),document.getElementById(t.cancelBtn)?.addEventListener("click",()=>this.hideModal()),document.getElementById(t.previewQuizBtn)?.addEventListener("click",()=>this.handleJsonPreview()),document.getElementById(t.saveLessonBtn)?.addEventListener("click",()=>this.saveLesson()),document.getElementById(t.saveOrderBtn)?.addEventListener("click",()=>this.saveLessonOrder()),document.getElementById(t.addVideo1RevBtn)?.addEventListener("click",()=>this.addRevUrlInput(1)),document.getElementById(t.addVideo2RevBtn)?.addEventListener("click",()=>this.addRevUrlInput(2)),this.handleLessonFilterChange()},addRevUrlInput(r,i=""){const a=document.getElementById(t.videoRevUrlsContainer(r));if(!a)return;const c=document.createElement("div");c.className="flex items-center gap-2";const u=document.createElement("input");u.type="url",u.className="w-full p-2 border rounded-md rev-url-input",u.value=i,u.placeholder=`보충 영상 URL #${a.children.length+1}`;const d=document.createElement("button");d.textContent="-",d.className="text-xs bg-red-500 text-white px-2 py-1 rounded-md font-bold",d.onclick=()=>{c.remove()},c.appendChild(u),c.appendChild(d),a.appendChild(c)},handleLessonFilterChange(){const r=!!e.state.selectedSubjectIdForMgmt,i=document.getElementById(t.lessonsManagementContent),a=document.getElementById(t.lessonPrompt),c=document.getElementById(t.lessonsList);i&&(i.style.display=r?"block":"none"),a&&(a.style.display=r?"none":"block"),r?this.listenForLessons():c&&(c.innerHTML="")},listenForLessons(){const{selectedSubjectIdForMgmt:r}=e.state;if(!r)return;const i=Ue(le(q,"subjects",r,"lessons"));Vn(i,a=>{let c=a.docs.map(u=>({id:u.id,...u.data()}));c.sort((u,d)=>(u.order??1/0)-(d.order??1/0)||(d.createdAt?.toMillis()||0)-(u.createdAt?.toMillis()||0)),e.state.lessons=c,this.renderLessonList()})},renderLessonList(){const r=document.getElementById(t.lessonsList);if(r.innerHTML="",e.state.lessons.length===0){r.innerHTML='<p class="text-center text-slate-500 py-8">아직 생성된 학습 세트가 없습니다.</p>';return}e.state.lessons.forEach(i=>this.renderLessonCard(i)),this.initDragAndDrop()},renderLessonCard(r){const i=document.getElementById(t.lessonsList),a=document.createElement("div"),c=r.isActive===!0;a.className=`lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${c?"bg-blue-50 border-blue-300":"bg-white"}`,a.setAttribute("draggable","true"),a.dataset.id=r.id,a.innerHTML=`
                <div class="flex items-center gap-3"><span class="drag-handle material-icons text-slate-400">drag_indicator</span><h3 class="font-bold text-slate-800">${r.title}</h3></div>
                <div class="flex-shrink-0 flex items-center gap-2">
                    <button data-id="${r.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                    <button data-id="${r.id}" data-active="${c}" class="toggle-active-btn ${c?"bg-gray-500":"bg-green-500"} text-white font-semibold px-3 py-1 rounded-lg text-xs">${c?"비활성화":"활성화"}</button>
                    <button data-id="${r.id}" class="delete-btn bg-red-500 text-white font-semibold px-3 py-1 rounded-lg text-xs">삭제</button>
                </div>`,i.appendChild(a),a.querySelector(".edit-lesson-btn").addEventListener("click",u=>this.openLessonModalForEdit(u.target.dataset.id)),a.querySelector(".toggle-active-btn").addEventListener("click",u=>this.toggleLessonActive(u.target.dataset.id,u.target.dataset.active==="true")),a.querySelector(".delete-btn").addEventListener("click",u=>this.deleteLesson(u.target.dataset.id))},initDragAndDrop(){const r=document.getElementById(t.lessonsList);let i=null;r.addEventListener("dragstart",a=>{i=a.target.closest(".lesson-card"),i&&setTimeout(()=>i.classList.add("dragging"),0)}),r.addEventListener("dragend",()=>{i&&i.classList.remove("dragging"),i=null}),r.addEventListener("dragover",a=>{a.preventDefault();const c=this.getDragAfterElement(r,a.clientY),u=document.querySelector(".dragging");u&&(c==null?r.appendChild(u):r.insertBefore(u,c))})},getDragAfterElement(r,i){return[...r.querySelectorAll(".lesson-card:not(.dragging)")].reduce((c,u)=>{const d=u.getBoundingClientRect(),f=i-d.top-d.height/2;return f<0&&f>c.offset?{offset:f,element:u}:c},{offset:Number.NEGATIVE_INFINITY}).element},async saveLessonOrder(){const{selectedSubjectIdForMgmt:r}=e.state;if(!r)return;const i=document.getElementById(t.lessonsList).querySelectorAll(".lesson-card");if(i.length===0)return;const a=ci(q);i.forEach((c,u)=>{const d=Ee(q,"subjects",r,"lessons",c.dataset.id);a.update(d,{order:u})});try{await a.commit(),M("학습 순서가 성공적으로 저장되었습니다.",!1)}catch{M("순서 저장에 실패했습니다.")}},async toggleLessonActive(r,i){const{selectedSubjectIdForMgmt:a}=e.state,c=Ee(q,"subjects",a,"lessons",r);try{await Xt(c,{isActive:!i}),M(`학습이 ${i?"비활성화":"활성화"}되었습니다.`,!1)}catch{M("활성화 상태 변경에 실패했습니다.")}},async deleteLesson(r){if(confirm("정말로 이 학습 세트를 삭제하시겠습니까?"))try{await ii(Ee(q,"subjects",e.state.selectedSubjectIdForMgmt,"lessons",r)),M("학습 세트가 성공적으로 삭제되었습니다.",!1)}catch{M("학습 세트 삭제에 실패했습니다.")}},async saveLesson(){const{selectedSubjectIdForMgmt:r,editingLesson:i,generatedQuiz:a,lessons:c}=e.state,u=document.getElementById(t.lessonTitle).value.trim(),d=document.getElementById(t.video1Url).value.trim(),f=document.getElementById(t.video2Url).value.trim(),p=Array.from(document.querySelectorAll(`#${t.videoRevUrlsContainer(1)} .rev-url-input`)).map(P=>P.value.trim()).filter(Boolean),y=Array.from(document.querySelectorAll(`#${t.videoRevUrlsContainer(2)} .rev-url-input`)).map(P=>P.value.trim()).filter(Boolean);if(!u||!d||!f||!a){M("제목, 기본 영상 1, 문제 풀이 영상 2, 퀴즈 정보는 필수입니다.");return}this.setSaveButtonLoading(!0);const S={title:u,video1Url:d,video2Url:f,video1RevUrls:p,video2RevUrls:y,questionBank:a};console.log("[Shared] 🔥 lessonData being saved:",JSON.stringify(S,null,2));try{if(i){if(console.log("[Shared] 🛠️ Updating lesson. Path:","subjects",r,"lessons",i?.id),!r||!i.id)throw new Error("과목 ID 또는 수정할 학습 ID가 없습니다.");await Xt(Ee(q,"subjects",r,"lessons",i.id),S),M("학습 세트가 성공적으로 수정되었습니다.",!1)}else{if(console.log("[Shared] ✨ Creating new lesson. Path:","subjects",r,"lessons"),!r)throw new Error("과목 ID가 없습니다.");Object.assign(S,{order:c.length,isActive:!1,createdAt:ai()}),await Cs(le(q,"subjects",r,"lessons"),S),M("학습 세트가 성공적으로 생성되었습니다.",!1)}this.hideModal()}catch(P){console.error("[Shared] Firestore 저장 오류:",P),M("저장 실패: "+P.message)}finally{this.setSaveButtonLoading(!1)}},openLessonModalForCreate(){e.state.editingLesson=null,document.getElementById(t.modalTitle).textContent="새 학습 세트 만들기",document.getElementById(t.lessonTitle).value="",document.getElementById(t.video1Url).value="",document.getElementById(t.video2Url).value="",document.getElementById(t.videoRevUrlsContainer(1)).innerHTML="",document.getElementById(t.videoRevUrlsContainer(2)).innerHTML="",document.getElementById(t.quizJsonInput).value="",document.getElementById(t.questionsPreviewContainer).classList.add("hidden"),e.state.generatedQuiz=null,document.getElementById(t.modal).style.display="flex"},openLessonModalForEdit(r){const i=e.state.lessons.find(u=>u.id===r);if(!i){M("수정할 학습 세트 정보를 찾을 수 없습니다.");return}e.state.editingLesson=i,document.getElementById(t.modalTitle).textContent="학습 세트 수정",document.getElementById(t.lessonTitle).value=i.title,document.getElementById(t.video1Url).value=i.video1Url,document.getElementById(t.video2Url).value=i.video2Url;const a=document.getElementById(t.videoRevUrlsContainer(1)),c=document.getElementById(t.videoRevUrlsContainer(2));a.innerHTML="",c.innerHTML="",i.video1RevUrls?.forEach(u=>this.addRevUrlInput(1,u)),i.video2RevUrls?.forEach(u=>this.addRevUrlInput(2,u)),document.getElementById(t.quizJsonInput).value=JSON.stringify(i.questionBank||{},null,2),this.handleJsonPreview(),document.getElementById(t.modal).style.display="flex"},hideModal(){e.state.editingLesson=null,document.getElementById(t.modal).style.display="none"},handleJsonPreview(){const r=document.getElementById(t.quizJsonInput).value.trim(),i=document.getElementById(t.questionsPreviewContainer);if(!r){M("붙여넣은 내용이 없습니다."),e.state.generatedQuiz=null,i.classList.add("hidden");return}try{const a=JSON.parse(r),c=Array.isArray(a)?a:a.questionBank;if(!Array.isArray(c))throw new Error("JSON 데이터에서 'questionBank' 배열을 찾을 수 없습니다.");e.state.generatedQuiz=c;const u=e.state.generatedQuiz.length;document.getElementById(t.questionsPreviewTitle).textContent=`생성된 퀴즈 (${u}문항)`,document.getElementById(t.questionsPreviewList).innerHTML=e.state.generatedQuiz.map((d,f)=>`<p><b>${f+1}. ${d.question||"질문 없음"}</b></p>`).join(""),i.classList.remove("hidden"),M(`퀴즈 ${u}개를 성공적으로 불러왔습니다.`,!1)}catch(a){e.state.generatedQuiz=null,i.classList.add("hidden"),M(`JSON 형식이 올바르지 않습니다: ${a.message}`)}},setSaveButtonLoading(r){const i=document.getElementById(t.saveBtnText),a=document.getElementById(t.saveLoader),c=document.getElementById(t.saveLessonBtn);i&&i.classList.toggle("hidden",r),a&&a.classList.toggle("hidden",!r),c&&(c.disabled=r)}}}const eu={app:null,elements:{subjectSelectForMgmt:"admin-subject-select-for-lesson",lessonsManagementContent:"admin-lessons-management-content",lessonPrompt:"admin-lesson-prompt",lessonsList:"admin-lessons-list",saveOrderBtn:"admin-save-lesson-order-btn",showNewLessonModalBtn:"admin-show-new-lesson-modal-btn",modal:"admin-new-lesson-modal",modalTitle:"admin-lesson-modal-title",closeModalBtn:"admin-close-modal-btn",cancelBtn:"admin-cancel-btn",lessonTitle:"admin-lesson-title",video1Url:"admin-video1-url",video2Url:"admin-video2-url",videoRevUrlsContainer:n=>`admin-video${n}-rev-urls-container`,addVideo1RevBtn:"admin-add-video1-rev-btn",addVideo2RevBtn:"admin-add-video2-rev-btn",quizJsonInput:"admin-quiz-json-input",previewQuizBtn:"admin-preview-quiz-btn",questionsPreviewContainer:"admin-questions-preview-container",questionsPreviewTitle:"admin-questions-preview-title",questionsPreviewList:"admin-questions-preview-list",saveLessonBtn:"admin-save-lesson-btn",saveBtnText:"admin-save-btn-text",saveLoader:"admin-save-loader"}},tu={init(n){eu.app=n,rv(eu).init()}},iv={init(n){this.app=n,this.elements={sourceClassSelect:document.getElementById("admin-source-class-select"),targetClassSelect:document.getElementById("admin-target-class-select"),studentSearchInput:document.getElementById("admin-student-search-input-assignment"),sourceStudentList:document.getElementById("admin-source-student-list"),assignBtn:document.getElementById("admin-assign-students-btn")},this.state={students:[],selectedStudentIds:new Set},this.elements.sourceClassSelect&&this.elements.sourceClassSelect.addEventListener("change",()=>this.handleSourceClassChange()),this.elements.studentSearchInput&&this.elements.studentSearchInput.addEventListener("input",()=>this.renderStudentList()),this.elements.assignBtn&&this.elements.assignBtn.addEventListener("click",()=>this.assignStudents()),document.getElementById("goto-student-assignment-btn").addEventListener("click",()=>{this.populateClassSelects(),this.resetView()})},populateClassSelects(){const{classes:n}=this.app.state,e=this.elements.sourceClassSelect,t=this.elements.targetClassSelect;e.innerHTML='<option value="unassigned">미배정</option>',t.innerHTML='<option value="">-- 배정할 반 --</option>',n.forEach(s=>{e.innerHTML+=`<option value="${s.id}">${s.name}</option>`,t.innerHTML+=`<option value="${s.id}">${s.name}</option>`})},resetView(){this.elements.sourceStudentList.innerHTML='<p class="text-sm text-slate-400">먼저 반을 선택해주세요.</p>',this.elements.studentSearchInput.value="",this.state.students=[],this.state.selectedStudentIds.clear()},async handleSourceClassChange(){const n=this.elements.sourceClassSelect.value;this.elements.sourceStudentList.innerHTML='<div class="loader-small"></div>';let e;n==="unassigned"?e=Ue(le(q,"students"),Rr("classId","==",null)):e=Ue(le(q,"students"),Rr("classId","==",n));const t=await bt(e);this.state.students=t.docs.map(s=>({id:s.id,...s.data()})),this.state.students.sort((s,r)=>s.name.localeCompare(r.name)),this.state.selectedStudentIds.clear(),this.renderStudentList()},renderStudentList(){const n=this.elements.studentSearchInput.value.toLowerCase(),e=this.elements.sourceStudentList;e.innerHTML="";const t=this.state.students.filter(s=>s.name.toLowerCase().includes(n)||s.phone&&s.phone.includes(n));if(t.length===0){e.innerHTML='<p class="text-sm text-slate-400">해당 반에 학생이 없거나 검색 결과가 없습니다.</p>';return}t.forEach(s=>{const r=document.createElement("div");r.className=`p-3 border rounded-lg cursor-pointer ${this.state.selectedStudentIds.has(s.id)?"bg-blue-100 border-blue-300":"bg-white"}`,r.textContent=`${s.name} (${s.phone||"번호없음"})`,r.dataset.id=s.id,r.addEventListener("click",()=>{const i=r.dataset.id;this.state.selectedStudentIds.has(i)?(this.state.selectedStudentIds.delete(i),r.classList.remove("bg-blue-100","border-blue-300"),r.classList.add("bg-white")):(this.state.selectedStudentIds.add(i),r.classList.add("bg-blue-100","border-blue-300"),r.classList.remove("bg-white"))}),e.appendChild(r)})},async assignStudents(){const n=this.elements.targetClassSelect.value;if(!n){M("배정할 반을 선택해주세요.");return}if(this.state.selectedStudentIds.size===0){M("배정할 학생을 한 명 이상 선택해주세요.");return}if(confirm(`${this.state.selectedStudentIds.size}명의 학생을 선택한 반으로 배정하시겠습니까?`))try{const e=ci(q);this.state.selectedStudentIds.forEach(t=>{const s=Ee(q,"students",t);e.update(s,{classId:n})}),await e.commit(),M("학생 배정이 완료되었습니다.",!1),this.handleSourceClassChange()}catch(e){console.error("학생 배정 실패:",e),M("학생 배정에 실패했습니다.")}}},ov={isInitialized:!1,elements:{},state:{subjects:[],classes:[],students:[],teachers:[],lessons:[],editingClass:null,selectedSubjectIdForLesson:null,editingLesson:null,generatedQuiz:null,selectedClassIdForStudent:null,selectedSubjectIdForTextbook:null,selectedClassIdForClassVideo:null,currentClassVideoDate:null,currentClassVideos:[]},init(){document.getElementById("admin-initial-login").style.display="flex",document.getElementById("admin-main-dashboard").style.display="none",document.getElementById("admin-secret-login-btn")?.addEventListener("click",this.handleSecretLogin.bind(this))},async handleSecretLogin(){if(document.getElementById("admin-secret-password").value!=="qkraudtls0626^^"){M("비밀번호가 올바르지 않습니다.");return}try{await Sp(PI),M("인증 성공!",!1),this.showDashboard()}catch(e){console.error("익명 로그인 실패:",e),M("관리자 인증 실패. 인터넷 연결 확인.")}},showDashboard(){document.getElementById("admin-initial-login").style.display="none",document.getElementById("admin-main-dashboard").style.display="block",this.isInitialized||this.initializeDashboard()},initializeDashboard(){this.isInitialized||(this.isInitialized=!0,this.cacheElements(),this.lessonManager=tu,kI.init(this),VI.init(this),NI.init(this),DI.init(this),sv.init(this),tu.init(this),iv.init(this),this.addEventListeners(),this.showAdminSection("dashboard"))},cacheElements(){this.elements={dashboardView:document.getElementById("admin-dashboard-view"),gotoSubjectMgmtBtn:document.getElementById("goto-subject-mgmt-btn"),gotoTextbookMgmtBtn:document.getElementById("goto-textbook-mgmt-btn"),gotoClassMgmtBtn:document.getElementById("goto-class-mgmt-btn"),gotoStudentMgmtBtn:document.getElementById("goto-student-mgmt-btn"),gotoTeacherMgmtBtn:document.getElementById("goto-teacher-mgmt-btn"),gotoLessonMgmtBtn:document.getElementById("goto-lesson-mgmt-btn"),gotoStudentAssignmentBtn:document.getElementById("goto-student-assignment-btn"),gotoQnaVideoMgmtBtn:document.getElementById("goto-qna-video-mgmt-btn"),gotoClassVideoMgmtBtn:document.getElementById("goto-class-video-mgmt-btn"),qnaVideoMgmtView:document.getElementById("admin-qna-video-mgmt-view"),qnaClassSelect:document.getElementById("admin-qna-class-select"),qnaVideoDate:document.getElementById("admin-qna-video-date"),qnaVideoTitle:document.getElementById("admin-qna-video-title"),qnaVideoUrl:document.getElementById("admin-qna-video-url"),saveQnaVideoBtn:document.getElementById("admin-save-qna-video-btn"),subjectMgmtView:document.getElementById("admin-subject-mgmt-view"),textbookMgmtView:document.getElementById("admin-textbook-mgmt-view"),classMgmtView:document.getElementById("admin-class-mgmt-view"),studentMgmtView:document.getElementById("admin-student-mgmt-view"),teacherMgmtView:document.getElementById("admin-teacher-mgmt-view"),lessonMgmtView:document.getElementById("admin-lesson-mgmt-view"),studentAssignmentView:document.getElementById("admin-student-assignment-view"),classVideoMgmtView:document.getElementById("admin-class-video-mgmt-view"),newSubjectNameInput:document.getElementById("admin-new-subject-name"),addSubjectBtn:document.getElementById("admin-add-subject-btn"),subjectsList:document.getElementById("admin-subjects-list"),subjectSelectForTextbook:document.getElementById("admin-subject-select-for-textbook"),textbookManagementContent:document.getElementById("admin-textbook-management-content"),newTextbookNameInput:document.getElementById("admin-new-textbook-name"),addTextbookBtn:document.getElementById("admin-add-textbook-btn"),textbooksList:document.getElementById("admin-textbooks-list"),newClassNameInput:document.getElementById("admin-new-class-name"),addClassBtn:document.getElementById("admin-add-class-btn"),classesList:document.getElementById("admin-classes-list"),newStudentNameInput:document.getElementById("admin-new-student-name"),newStudentPasswordInput:document.getElementById("admin-new-student-phone"),newParentPhoneInput:document.getElementById("admin-new-parent-phone"),addStudentBtn:document.getElementById("admin-add-student-btn"),studentsList:document.getElementById("admin-students-list"),newTeacherNameInput:document.getElementById("admin-new-teacher-name"),newTeacherEmailInput:document.getElementById("admin-new-teacher-email"),newTeacherPhoneInput:document.getElementById("admin-new-teacher-phone"),addTeacherBtn:document.getElementById("admin-add-teacher-btn"),teachersList:document.getElementById("admin-teachers-list"),editTeacherModal:document.getElementById("admin-edit-teacher-modal"),closeEditTeacherModalBtn:document.getElementById("admin-close-edit-teacher-modal-btn"),cancelEditTeacherBtn:document.getElementById("admin-cancel-edit-teacher-btn"),saveTeacherEditBtn:document.getElementById("admin-save-teacher-edit-btn"),editTeacherNameInput:document.getElementById("admin-edit-teacher-name"),editTeacherEmailInput:document.getElementById("admin-edit-teacher-email"),editTeacherPhoneInput:document.getElementById("admin-edit-teacher-phone"),subjectSelectForLesson:document.getElementById("admin-subject-select-for-lesson"),lessonsManagementContent:document.getElementById("admin-lessons-management-content"),lessonPrompt:document.getElementById("admin-lesson-prompt"),lessonsList:document.getElementById("admin-lessons-list"),saveOrderBtn:document.getElementById("admin-save-lesson-order-btn"),modal:document.getElementById("admin-new-lesson-modal"),modalTitle:document.getElementById("admin-lesson-modal-title"),closeModalBtn:document.getElementById("admin-close-modal-btn"),cancelBtn:document.getElementById("admin-cancel-btn"),lessonTitle:document.getElementById("admin-lesson-title"),video1Url:document.getElementById("admin-video1-url"),video2Url:document.getElementById("admin-video2-url"),addVideo1RevBtn:document.getElementById("admin-add-video1-rev-btn"),addVideo2RevBtn:document.getElementById("admin-add-video2-rev-btn"),videoRevUrlsContainer:n=>`admin-video${n}-rev-urls-container`,quizJsonInput:document.getElementById("admin-quiz-json-input"),previewQuizBtn:document.getElementById("admin-preview-quiz-btn"),questionsPreviewContainer:document.getElementById("admin-questions-preview-container"),questionsPreviewTitle:document.getElementById("admin-questions-preview-title"),questionsPreviewList:document.getElementById("admin-questions-preview-list"),saveLessonBtn:document.getElementById("admin-save-lesson-btn"),saveBtnText:document.getElementById("admin-save-btn-text"),saveLoader:document.getElementById("admin-save-loader"),editClassModal:document.getElementById("admin-edit-class-modal"),editClassName:document.getElementById("admin-edit-class-name"),closeEditClassModalBtn:document.getElementById("admin-close-edit-class-modal-btn"),cancelEditClassBtn:document.getElementById("admin-cancel-edit-class-btn"),saveClassEditBtn:document.getElementById("admin-save-class-edit-btn"),editClassTypeSelect:document.getElementById("admin-edit-class-type"),editStudentModal:document.getElementById("admin-edit-student-modal"),closeEditStudentModalBtn:document.getElementById("admin-close-edit-student-modal-btn"),cancelEditStudentBtn:document.getElementById("admin-cancel-edit-student-btn"),saveStudentEditBtn:document.getElementById("admin-save-student-edit-btn"),editStudentNameInput:document.getElementById("admin-edit-student-name"),editStudentPhoneInput:document.getElementById("admin-edit-student-phone"),editParentPhoneInput:document.getElementById("admin-edit-parent-phone"),classVideoClassSelect:document.getElementById("admin-class-video-class-select"),classVideoDateInput:document.getElementById("admin-class-video-date"),classVideoListContainer:document.getElementById("admin-class-video-list-container"),addClassVideoFieldBtn:document.getElementById("admin-add-class-video-field-btn"),saveClassVideoBtn:document.getElementById("admin-save-class-video-btn")}},addEventListeners(){this.elements.gotoSubjectMgmtBtn?.addEventListener("click",()=>this.showAdminSection("subject-mgmt")),this.elements.gotoTextbookMgmtBtn?.addEventListener("click",()=>this.showAdminSection("textbook-mgmt")),this.elements.gotoClassMgmtBtn?.addEventListener("click",()=>this.showAdminSection("class-mgmt")),this.elements.gotoStudentMgmtBtn?.addEventListener("click",()=>this.showAdminSection("student-mgmt")),this.elements.gotoTeacherMgmtBtn?.addEventListener("click",()=>this.showAdminSection("teacher-mgmt")),this.elements.gotoLessonMgmtBtn?.addEventListener("click",()=>this.showAdminSection("lesson-mgmt")),this.elements.gotoStudentAssignmentBtn?.addEventListener("click",()=>this.showAdminSection("student-assignment")),this.elements.gotoQnaVideoMgmtBtn?.addEventListener("click",()=>this.showAdminSection("qna-video-mgmt"));const n=document.getElementById("goto-class-video-mgmt-btn");n?n.addEventListener("click",()=>{console.log("[adminApp.js] '수업 영상 관리' 메뉴 클릭됨"),this.showAdminSection("class-video-mgmt")}):console.error("[adminApp.js] 'goto-class-video-mgmt-btn' 요소를 HTML에서 찾을 수 없습니다."),document.querySelectorAll(".back-to-admin-dashboard-btn").forEach(e=>{e.addEventListener("click",()=>this.showAdminSection("dashboard"))}),this.elements.saveQnaVideoBtn?.addEventListener("click",()=>this.saveQnaVideo()),this.elements.classVideoClassSelect?.addEventListener("change",e=>this.handleClassVideoClassChange(e.target.value)),this.elements.classVideoDateInput?.addEventListener("change",e=>this.handleClassVideoDateChange(e.target.value)),this.elements.addClassVideoFieldBtn?.addEventListener("click",()=>this.addClassVideoField()),this.elements.saveClassVideoBtn?.addEventListener("click",()=>this.saveClassVideos()),document.addEventListener("subjectsUpdated",()=>{this.renderSubjectOptionsForTextbook(),this.renderSubjectOptionsForLesson()}),document.addEventListener("classesUpdated",()=>{this.populateClassSelectForQnaVideo(),this.populateClassSelectForClassVideo()})},showAdminSection(n){console.log(`[adminApp.js] Attempting to show section: ${n}`),Object.keys(this.elements).forEach(s=>{s.endsWith("View")&&this.elements[s]&&(this.elements[s].style.display="none")});const t={dashboard:this.elements.dashboardView,"subject-mgmt":this.elements.subjectMgmtView,"textbook-mgmt":this.elements.textbookMgmtView,"class-mgmt":this.elements.classMgmtView,"student-mgmt":this.elements.studentMgmtView,"teacher-mgmt":this.elements.teacherMgmtView,"lesson-mgmt":this.elements.lessonMgmtView,"student-assignment":this.elements.studentAssignmentView,"qna-video-mgmt":this.elements.qnaVideoMgmtView,"class-video-mgmt":this.elements.classVideoMgmtView}[n];t?(console.log(`[adminApp.js] Showing element: ${t.id}`),t.style.display="block"):(console.warn(`[adminApp.js] View element for "${n}" not found or null in elements cache. Showing dashboard.`),this.elements.dashboardView&&(this.elements.dashboardView.style.display="block")),n==="qna-video-mgmt"?this.populateClassSelectForQnaVideo():n==="class-video-mgmt"&&(console.log("[adminApp.js] Initializing Class Video View..."),this.initClassVideoView())},populateClassSelectForQnaVideo(){},async saveQnaVideo(){},renderSubjectOptionsForTextbook(){},renderSubjectOptionsForLesson(){},initClassVideoView(){},populateClassSelectForClassVideo(){},handleClassVideoClassChange(n){},handleClassVideoDateChange(n){},async loadClassVideos(){},renderClassVideoFields(n){},addClassVideoField(n="",e="",t=-1){},reindexClassVideoFields(){},async saveClassVideos(){}};document.addEventListener("DOMContentLoaded",()=>{ov.init()});
