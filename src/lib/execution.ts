export type RunResult={ok:boolean;output:string;elapsed:number;testsPassed?:number;testsTotal?:number};

declare global { interface Window { loadPyodide?: (opts:any)=>Promise<any>; initSqlJs?: (opts:any)=>Promise<any>; } }
let pyodidePromise:Promise<any>|null=null;
let sqlPromise:Promise<any>|null=null;
function loadScript(src:string){return new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Не удалось загрузить runtime'));document.head.appendChild(s)})}
async function getPyodide(){if(!pyodidePromise){pyodidePromise=(async()=>{if(!window.loadPyodide) await loadScript('https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js');if(!window.loadPyodide)throw new Error('Pyodide недоступен');return window.loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/'})})()}return pyodidePromise}
async function getSql(){if(!sqlPromise){sqlPromise=(async()=>{if(!window.initSqlJs) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js');if(!window.initSqlJs)throw new Error('SQL.js недоступен');return window.initSqlJs({locateFile:(f:string)=>`https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`})})()}return sqlPromise}

const pyTests:Record<string,string>={
 'task-1':'assert count_freq(["a","b","a"]) == {"a":2,"b":1}; assert count_freq([]) == {}',
 'task-2':'assert first_unique("swiss") == "w"; assert first_unique("aabb") is None',
 'task-3':'assert two_sum([2,7,11,15],9) == [0,1]',
 'task-4':'assert is_valid("([])") is True; assert is_valid("([)]") is False',
 'task-5':'assert max_window([1,3,-1,-3,5,3,6,7],3) == [3,3,5,5,6,7]',
 'task-6':'assert binary_search([1,3,5,7],5) == 2; assert binary_search([1,3,5,7],4) == -1',
 'task-7':'import numpy as np; X=np.array([[1.,2.],[3.,4.]]); Z=zscore_columns(X); assert np.allclose(Z.mean(axis=0),[0,0])',
 'task-8':'assert abs(precision(8,2)-0.8)<1e-9; assert precision(0,0)==0.0',
 'task-9':'assert abs(f1(.8,.5)-0.615384615)<1e-6',
 'task-10':'assert step([1,2],[.1,-.2],.5)==[.95,2.1]',
 'task-16':'assert abs(cosine_similarity([1,0],[1,0])-1)<1e-9; assert abs(cosine_similarity([1,0],[0,1]))<1e-9',
 'task-17':'assert idf(10,0)>idf(10,10)',
 'task-18':'assert normalize_spaces("  a\\n b  ") == "a b"',
 'task-19':'assert bio_to_spans(["B-PER","I-PER","O","B-ORG"]) == [(0,2,"PER"),(3,4,"ORG")]',
 'task-27':'assert entropy([.5,.5]) == 1.0',
 'task-28':'import numpy as np; tr=np.array([[1.,np.nan],[3.,4.]]); te=np.array([[np.nan,8.]]); a,b=impute(tr,te); assert not np.isnan(b).any()',
 'task-29':'assert abs(psi([.5,.5],[.5,.5]))<1e-9',
};
const sqlFixtures:Record<string,string>={
 'task-11':`CREATE TABLE orders(customer_id INTEGER, amount REAL); INSERT INTO orders VALUES (1,600),(1,500),(2,900),(2,50),(3,2000);`,
 'task-12':`CREATE TABLE users(id INTEGER, is_active INTEGER); INSERT INTO users VALUES (1,1),(2,0),(3,1),(4,1);`,
 'task-13':`CREATE TABLE orders(customer_id INTEGER, created_at TEXT, amount REAL); INSERT INTO orders VALUES (1,'2026-01-01',10),(1,'2026-01-03',30),(2,'2026-01-02',20);`,
 'task-14':`CREATE TABLE sales(day TEXT, amount REAL); INSERT INTO sales VALUES ('2026-01-01',1),('2026-01-02',2),('2026-01-03',3),('2026-01-04',4);`,
 'task-15':`CREATE TABLE users(id INTEGER); INSERT INTO users VALUES (1),(2),(3); CREATE TABLE orders(user_id INTEGER); INSERT INTO orders VALUES (1),(1);`,
 'task-16':`CREATE TABLE payments(user_id INTEGER, amount REAL); INSERT INTO payments VALUES (1,10),(1,20),(1,30),(1,40),(1,50),(2,100),(2,120);`
};
const sqlExpected:Record<string,string>={
 'task-11':'1|1100\n3|2000','task-12':'0.75','task-13':'1|2026-01-03|30\n2|2026-01-02|20','task-14':'2026-01-01|1\n2026-01-02|3\n2026-01-03|6\n2026-01-04|10','task-15':'2\n3','task-16-sql':'1|30|5'
};
function norm(v:any){return String(v).trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join('\n')}
export function supportsExecution(id:string,category:string){return pyTests[id]||category==='SQL'}
export async function runTask(id:string,category:string,code:string):Promise<RunResult>{const started=performance.now();try{if(category==='SQL'){const SQL=await getSql();const db=new SQL.Database();const fixture=sqlFixtures[id]||sqlFixtures['task-11'];db.run(fixture);const res=db.exec(code);if(!res.length)return {ok:true,output:'Запрос выполнен. Запрос не вернул строк.',elapsed:performance.now()-started};const rows=res[0].values.map((r:any[])=>r.map(String).join('|')).join('\n');const expected=sqlExpected[id];return {ok:expected?norm(rows)===norm(expected):true,output:rows,elapsed:performance.now()-started,testsPassed:expected?norm(rows)===norm(expected)?1:0:undefined,testsTotal:expected?1:undefined};}
const py=await getPyodide();const tests=pyTests[id]||'';const full=`${code}\n\n${tests}`;try{await py.runPythonAsync(full);return {ok:true,output:'Все доступные тесты пройдены.',elapsed:performance.now()-started,testsPassed:tests?1:undefined,testsTotal:tests?1:undefined}}catch(e:any){return {ok:false,output:String(e),elapsed:performance.now()-started,testsPassed:0,testsTotal:tests?1:undefined}}}catch(e:any){return {ok:false,output:`Runtime: ${e?.message||String(e)}`,elapsed:performance.now()-started}}}
