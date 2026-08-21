const DATA_KEY='spt-merge-demo-data-v1';
const uid='guest-local';
const blank=()=>({students:[],batches:[],requests:[],activities:[],tasks:[],guardianNotifications:[]});
function read(){try{const saved=JSON.parse(localStorage.getItem(DATA_KEY)||'null');if(saved)return Object.assign(blank(),saved);const demo={students:[{id:'demo-1',name:'আরিফা রহমান',schoolName:'ঢাকা ক্যান্টনমেন্ট মডেল কলেজ',grade:'৮ম শ্রেণি',progress:86,subjects:['বাংলা','গণিত'],note:'সাপ্তাহিক অনুশীলন ভালো হয়েছে',updatedAt:Date.now()-86400000},{id:'demo-2',name:'রহিম হোসেন',schoolName:'মতিঝিল সরকারি বালক উচ্চ বিদ্যালয়',grade:'৭ম শ্রেণি',progress:60,subjects:['ইংরেজি'],note:'হোমওয়ার্ক সম্পন্ন করতে হবে',updatedAt:Date.now()-259200000},{id:'demo-3',name:'করিম হাসান',schoolName:'ভিকারুননিসা নূন স্কুল',grade:'১০ম শ্রেণি',progress:32,subjects:['বিজ্ঞান'],note:'আজকের অগ্রগতি লিখুন',updatedAt:Date.now()-604800000}]};write(demo);return demo;}catch{return blank();}}
function write(data){localStorage.setItem(DATA_KEY,JSON.stringify(data));}
export const auth={currentUser:null};
export const RoomAccessMode={APPROVAL:'approval',IMMEDIATE:'immediate'};
export function subscribeAuth(cb){setTimeout(()=>{const guest=localStorage.getItem('spt-guest-mode-v1')==='1';auth.currentUser=guest?{uid,email:'guest@offline.local',displayName:localStorage.getItem('spt-guest-name-v1')||'Guest'}:null;cb(auth.currentUser);},20);return()=>{};}
export async function signInWithGoogle(){auth.currentUser={uid:'guest-local',email:'guest@offline.local',displayName:'Guest'};localStorage.setItem('spt-guest-mode-v1','1');return auth.currentUser;}
export async function signOutUser(){auth.currentUser=null;localStorage.removeItem('spt-guest-mode-v1');location.reload();}
export async function ensureProfile(user){return {uid:user.uid,name:user.displayName||'Guest',status:'active'};}
export async function getRoles(){return {isAdmin:false,isSuperAdmin:false};}
export function subscribeTeacherWorkspace(userId,handlers){const push=()=>{const d=read();for(const [key,fn] of Object.entries(handlers)){if(typeof fn==='function'&&key in d)fn(d[key]);}if(handlers.error){} };push();return()=>{};}
export async function createStudent(input){const d=read();const student=Object.assign({id:'student-'+Date.now(),name:'নতুন শিক্ষার্থী',grade:'',schoolName:'',progress:0,subjects:[]},input||{});d.students.push(student);write(d);return student;}
export async function createBatch(input){const d=read();const batch=Object.assign({id:'batch-'+Date.now(),name:'নতুন ব্যাচ',description:'',students:[]},input||{});d.batches.push(batch);write(d);return batch;}
export async function createBatchRoom(){return {code:'DEMO12345678'};}
export async function terminateStudentRoom(){return true;}
export async function ensureBatchRoom(){return {code:'DEMO12345678'};}
export async function lookupRoom(){return null;}
export async function createGuardianRequest(){return {status:'pending'};}
export async function approveGuardianRequest(){return true;}
export async function rejectGuardianRequest(){return true;}
export async function guardianApprovals(){return[];}
export async function guardianBatchAccess(){return[];}
export async function guardianStudentReport(){return null;}
export async function guardianBatchReport(){return null;}
export async function requestGuardianChildLink(){return true;}
export async function createOrUpdatePresence(){return true;}
export async function listCurriculumVersions(){return[];}
export async function saveCurriculumVersion(x){return x;}
export async function listCurriculumBooks(){return[];}
export async function listCurriculumChapters(){return[];}
export async function saveCurriculumBook(x){return x;}
export async function saveCurriculumChapter(x){return x;}
export async function setCurriculumVersionStatus(){return true;}
export async function listAssessmentTemplates(){return[];}
export async function saveAssessmentTemplate(x){return x;}
export async function exportTeacherData(){return read();}
export async function recordBatchSession(x){return x;}
export async function listBatchSessions(){return[];}
export function subscribeConnectionState(cb){cb({online:false,guest:true});return()=>{};}
export async function guardianNotifications(){return[];}
export async function markGuardianNotificationRead(){return true;}
export async function setAccountBlocked(){return true;}
export async function setAdministratorRole(){return true;}
export async function listAdminAccounts(){return[];}
export async function listAdminAudit(){return[];}
export async function createTeacherTask(x){return x;}
export async function updateTeacherTask(x){return x;}
