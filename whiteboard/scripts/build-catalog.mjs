// 이미지 기준 카탈로그 재구성: assets/covers 이미지를 파싱해 data/books.json 생성.
// 각 이미지 = 교재 1개. 사용 이미지는 real/{id}.{ext}로 clean 복사(한글·공백 경로 취약성 회피).
// 추후 카탈로그 API로 교체 시 이 산출물 스키마를 그대로 사용(전방호환).
import { readdirSync, copyFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WB = join(here, '..');
const COVERS = join(WB, 'assets', 'covers');
const REAL = join(COVERS, 'real');
mkdirSync(REAL, { recursive: true });

const GRADE = { A:'cho1', B:'cho2', C:'cho3', D:'cho4', E:'cho5', F:'cho6' };
const nfc = s => s.normalize('NFC');
const COLORS = { 사고력:'#5AAE00', 연산:'#F19A2F', 교과:'#2E6FB0', 경시:'#C68A1E' };

let seq = 0;
const books = [];
// order: 사용된 원본 파일을 real/{id}.{ext}로 복사하고 cover 경로 반환
function add({ src, srcDir=COVERS, title, subject, grade=null, sem=null, hidden=false, order }) {
  seq++;
  const id = 'bk-' + String(seq).padStart(3, '0');
  const ext = extname(src);
  copyFileSync(join(srcDir, src), join(REAL, id + ext));
  books.push({ id, title, subject, grade, sem, year: '2022', cover: `assets/covers/real/${id}${ext}`,
               color: COLORS[subject], game: true, hidden, order });
}

// ── 사고력: 레이/레인보우/프리즘 계열 (학년 문자 A~F → 초1~6) ──
const think = [
  ['레이 A1-1_표지.jpg','레이 A1-1','A'], ['레이 B1-1_표지.jpg','레이 B1-1','B'], ['레이 C1-1_표지.jpg','레이 C1-1','C'],
  ['레이플러스 B1-1(상)_표지.jpg','레이플러스 B1-1 (상)','B'], ['레이플러스 C1-1(상)_표지.jpg','레이플러스 C1-1 (상)','C'],
  ['레인보우 D1-1_표지.jpg','레인보우 D1-1','D'], ['레인보우 E1-1_표지.jpg','레인보우 E1-1','E'],
  ['레인보우플러스 D1-1_표지.jpg','레인보우플러스 D1-1','D'], ['레인보우플러스 E1-1_표지.jpg','레인보우플러스 E1-1','E'],
  ['프리즘 D1-1_표지.jpg','프리즘 D1-1','D'], ['프리즘 E1-1_표지.jpg','프리즘 E1-1','E'], ['프리즘 F1-1_표지.jpg','프리즘 F1-1','F'],
  ['프리즘플러스-D1-1_표지.jpg','프리즘플러스 D1-1','D'], ['프리즘플러스-E1-1_표지.jpg','프리즘플러스 E1-1','E'], ['프리즘플러스-F1-1_표지.jpg','프리즘플러스 F1-1','F'],
];
think.forEach(([src,title,g]) => add({ src, title, subject:'사고력', grade:GRADE[g], order:2 }));

// ── 연산: 소마셈 (K=유아, A~d=초1~4) ──
const sem = [['소마샘_k.png','소마셈 K','유아'],['소마샘_A.png','소마셈 A','cho1'],['소마샘_b.png','소마셈 B','cho2'],['소마샘_c.png','소마셈 C','cho3'],['소마샘_d.png','소마셈 D','cho4']];
sem.forEach(([src,title,grade]) => add({ src, title, subject:'연산', grade, order:1 }));

// ── 교과: 소마 스트라이크 기본 진도북 (real/strike-*, 초3~6 × 1·2학기) ──
for (let g=3; g<=6; g++) for (let s=1; s<=2; s++)
  add({ src:`strike-${g}-${s}-jindo.png`, srcDir:REAL, title:`소마 스트라이크 ${g}-${s} 기본 진도북`, subject:'교과', grade:`cho${g}`, sem:`s${s}`, order:0 });

// ── 경시: 프리미어 초급/중급(권차) + 특강 ──
for (let n=1; n<=8; n++) add({ src:`프리미어 초급${n}.png`, title:`프리미어 초급 ${n}`, subject:'경시', order:3 });
for (let n=1; n<=8; n++) add({ src:(n===8?`프리미어 중급8(리스트에는 없음).png`:`프리미어 중급${n}.png`), title:`프리미어 중급 ${n}`, subject:'경시', hidden:(n===8), order:3 });
add({ src:'프리미어 AL-1_표지.jpg', title:'프리미어 AL-1', subject:'경시', order:4 });
add({ src:'프리미어 GE-1_표지.jpg', title:'프리미어 GE-1', subject:'경시', order:4 });
add({ src:'프리미어경시1-1_표지.jpg', title:'프리미어 경시 1-1', subject:'경시', order:4 });

// 정렬(큐레이션): order asc, 그다음 제목
books.sort((a,b)=> (a.order-b.order) || a.title.localeCompare(b.title,'ko'));
books.forEach(b=> delete b.order);

const out = { generatedNote:'build-catalog.mjs 산출물(이미지 기준) — 추후 카탈로그 API로 교체', books };
writeFileSync(join(WB,'data','books.json'), JSON.stringify(out));
const vis = books.filter(b=>!b.hidden).length;
console.log(`books.json 생성: 총 ${books.length}권 (노출 ${vis}, hidden ${books.length-vis})`);
const by = {};
books.forEach(b=> by[b.subject]=(by[b.subject]||0)+1);
console.log('과목별:', by);
