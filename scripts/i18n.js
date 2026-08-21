const key='spt-language-v1';
let language=localStorage.getItem(key)||'bn';
const bn={search:'নাম দিয়ে খুঁজুন',createStudent:'শিক্ষার্থী যোগ করুন',noStudents:'কোনো শিক্ষার্থী নেই',signOut:'সাইন আউট',student:'শিক্ষার্থী',students:'শিক্ষার্থী',dashboard:'ড্যাশবোর্ড',batches:'ব্যাচ',requests:'অভিভাবক অনুরোধ',plans:'পরিকল্পনা',settings:'সেটিংস'};
const en={search:'Search by name',createStudent:'Add student',noStudents:'No students yet',signOut:'Sign out',student:'Student',students:'Students',dashboard:'Dashboard',batches:'Batches',requests:'Guardian requests',plans:'Plans',settings:'Settings'};
export const PROGRAMMES=[];
export function getLanguage(){return language;}
export function setLanguage(next){language=next==='en'?'en':'bn';localStorage.setItem(key,language);return language;}
export function t(name){return (language==='bn'?bn:en)[name]||name;}
export function localDate(value){try{return new Intl.DateTimeFormat(language==='bn'?'bn-BD':undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}catch{return String(value||'');}}
export function localNumber(value){return new Intl.NumberFormat(language==='bn'?'bn-BD':undefined).format(Number(value)||0);}
export function programmeLabel(value){return value||'';}
