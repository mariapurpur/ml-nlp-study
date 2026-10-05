import {Progress} from '../types';
export const KEY='ml-nlp-academy-progress-v2';
export const emptyProgress=():Progress=>({completedTopics:[],completedTasks:[],cardStats:{},quizHistory:[],answers:{},interviewSeen:[],streak:{last:'',days:0},skills:{},taskAttempts:{},careerLevel:'junior',dailyGoal:20,cardSessions:[],settings:{dailyGoalMinutes:20}});
export function loadProgress():Progress{try{const raw=JSON.parse(localStorage.getItem(KEY)||'null'); if(!raw)return emptyProgress(); return migrate(raw)}catch{return emptyProgress()}}
export function migrate(raw:any):Progress{const base=emptyProgress(); return {...base,...raw,cardStats:raw.cardStats||{},skills:raw.skills||{},taskAttempts:raw.taskAttempts||{},cardSessions:raw.cardSessions||[],settings:{...base.settings,...(raw.settings||{})},careerLevel:raw.careerLevel||'junior',quizHistory:(raw.quizHistory||[]).map((x:any)=>({...x,careerLevel:x.careerLevel||'junior'}))}}
export function saveProgress(p:Progress){localStorage.setItem(KEY,JSON.stringify(p))}
export function exportProgress(p:Progress){const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ml-nlp-academy-progress.json';a.click();URL.revokeObjectURL(url)}
export function importProgress(file:File):Promise<Progress>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{try{resolve(migrate(JSON.parse(String(r.result))))}catch(e){reject(e)}};r.onerror=reject;r.readAsText(file)})}
