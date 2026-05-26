const ELEVS='ABCDEFGHIJK'.split('');
const ISSUES=['Entrapment','Door Issue','Mechanical Failure','Power Outage','Inspection Issue','Noise/Vibration','Other'];
const STATS=['Open','In Progress','Resolved'];
const MOS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MOSL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ICOLS={'Entrapment':'#4b5563','Door Issue':'#6b7280','Mechanical Failure':'#374151','Power Outage':'#9ca3af','Inspection Issue':'#111827','Noise/Vibration':'#d1d5db','Other':'#6b7280'};

const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

//  Storage helpers 
const load=()=>{try{return JSON.parse(localStorage.getItem('liftlog2')||'[]')}catch{return[]}};
const save=d=>localStorage.setItem('liftlog2',JSON.stringify(d));



//  Year dropdown 
function buildYearList(){
  const thisYear=new Date().getFullYear();
  const dataYears=new Set(load().map(r=>r.date.slice(0,4)));
  const yrs=new Set();
  for(let y=2020;y<=2035;y++)yrs.add(String(y));
  dataYears.forEach(y=>yrs.add(y));
  return [...yrs].sort((a,b)=>b-a);
}

function initYrDrop(){
  const yrs=buildYearList();
  const sel=document.getElementById('gyr');
  const cur=sel.value||String(new Date().getFullYear());
  sel.innerHTML=yrs.map(y=>`<option value="${y}">${y}</option>`).join('');
  sel.value=yrs.includes(cur)?cur:String(new Date().getFullYear());
}

const getYr=()=>document.getElementById('gyr').value;

//  Page navigation 
function go(id){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(b=>b.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  document.querySelectorAll('.ni')[['dash','add','log','trap','dl'].indexOf(id)].classList.add('on');
  if(id==='dash')renderDash();
  if(id==='log')renderLog();
  if(id==='trap')renderTrap();
  if(id==='dl')renderDL();
}

function refresh(){renderDash();renderLog();renderTrap();renderDL()}

//  Dashboard 
function renderDash(){
  const yr=getYr();
  const data=load().filter(r=>r.date.startsWith(yr));
  document.getElementById('dash-sub').textContent=`${data.length} incidents recorded in ${yr}`;
  const trap=data.filter(r=>r.issue==='Entrapment').length;
  document.getElementById('k-tot').textContent=data.length;
  document.getElementById('k-tr').textContent=trap;
  document.getElementById('k-ot').textContent=data.length-trap;
  document.getElementById('k-op').textContent=data.filter(r=>r.status==='Open').length;
  document.getElementById('k-ip').textContent=data.filter(r=>r.status==='In Progress').length;
  document.getElementById('k-re').textContent=data.filter(r=>r.status==='Resolved').length;

  const ec={};ELEVS.forEach(l=>ec[l]=0);data.forEach(r=>ec[r.elevator]=(ec[r.elevator]||0)+1);
  const top=Object.entries(ec).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('top-elev').textContent=top&&top[1]>0?`Elevator ${top[0]} - ${top[1]} incidents`:'No incidents yet';

  const maxE=Math.max(1,...Object.values(ec));
  document.getElementById('elev-bars').innerHTML=ELEVS.map(l=>`<div class="br"><div class="bl">Elev ${l}</div><div class="bt"><div class="bf" style="width:${Math.round(ec[l]/maxE*100)}%"></div></div><div class="bc">${ec[l]}</div></div>`).join('');

  const ic={};ISSUES.forEach(t=>ic[t]=0);data.forEach(r=>ic[r.issue]=(ic[r.issue]||0)+1);
  drawPie(ic,data.length);

  const mc={};for(let i=0;i<12;i++)mc[i]=0;data.forEach(r=>{const m=parseInt(r.date.slice(5,7))-1;mc[m]=(mc[m]||0)+1});
  const maxM=Math.max(1,...Object.values(mc));
  const trendOn=cssVar('--blue')||'#4b5563';
  const trendOff=cssVar('--bdr')||'#9ca3af';
  document.getElementById('trend').innerHTML=Object.values(mc).map(v=>`<div class="tc"><div class="tb" style="height:${Math.round(v/maxM*88)+2}px;background:${v?trendOn:trendOff}"></div></div>`).join('');
  document.getElementById('trend-lbl').innerHTML=MOS.map(m=>`<div style="flex:1;text-align:center;font-size:9px;color:var(--tx3);font-family:var(--fh)">${m}</div>`).join('');
}

function drawPie(ic,tot){
  const cv=document.getElementById('pie-c'),ctx=cv.getContext('2d');
  const pieEmpty=cssVar('--bdr')||'#9ca3af';
  const pieCenter=cssVar('--surf')||'#f3f4f6';
  ctx.clearRect(0,0,160,160);
  const entries=Object.entries(ic).filter(([,v])=>v>0);
  if(!entries.length){ctx.fillStyle=pieEmpty;ctx.beginPath();ctx.arc(80,80,62,0,2*Math.PI);ctx.fill();}
  else{
    let s=-Math.PI/2;
    entries.forEach(([k,v])=>{const sl=(v/tot)*2*Math.PI;ctx.beginPath();ctx.moveTo(80,80);ctx.arc(80,80,62,s,s+sl);ctx.fillStyle=ICOLS[k]||'#5c637a';ctx.fill();s+=sl});
    ctx.beginPath();ctx.arc(80,80,34,0,2*Math.PI);ctx.fillStyle=pieCenter;ctx.fill();
  }
  document.getElementById('pie-leg').innerHTML=entries.map(([k,v])=>`<div class="pi"><div class="pd" style="background:${ICOLS[k]}"></div><div class="pn">${k}</div><div class="pv">${v} <span class="ppc">${tot?Math.round(v/tot*100):0}%</span></div></div>`).join('');
}

//  Badge helpers 
function bClass(i){const m={'Entrapment':'entr','Door Issue':'door','Mechanical Failure':'mech','Power Outage':'powr'};return'b-'+(m[i]||'othr')}
function sClass(s){return s==='Open'?'b-open':s==='In Progress'?'b-prog':'b-res'}

//  Incident Log 
function renderLog(){
  let data=load();
  const fy=document.getElementById('lf-yr').value,fm=document.getElementById('lf-mo').value,
        fe=document.getElementById('lf-el').value,fi=document.getElementById('lf-is').value,
        fs=document.getElementById('lf-st').value,fq=(document.getElementById('lf-q').value||'').toLowerCase();
  if(fy)data=data.filter(r=>r.date.startsWith(fy));
  if(fm)data=data.filter(r=>parseInt(r.date.slice(5,7))===parseInt(fm));
  if(fe)data=data.filter(r=>r.elevator===fe);
  if(fi)data=data.filter(r=>r.issue===fi);
  if(fs)data=data.filter(r=>r.status===fs);
  if(fq)data=data.filter(r=>(r.building||'').toLowerCase().includes(fq)||(r.description||'').toLowerCase().includes(fq)||(r.notes||'').toLowerCase().includes(fq));
  data.sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('log-cnt').textContent=data.length;
  document.getElementById('log-body').innerHTML=data.length
    ?data.map(r=>`<tr><td>${r.id}</td><td>${r.date}</td><td>${r.building||'-'}</td><td>Elev ${r.elevator}</td><td><span class="badge ${bClass(r.issue)}">${r.issue}</span></td><td style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.description||'').replace(/"/g,'&quot;')}">${r.description||'-'}</td><td><span class="badge ${sClass(r.status)}">${r.status}</span></td></tr>`).join('')
    :`<tr><td colspan="7"><div class="nd"><i class="ti ti-mood-empty"></i>No incidents match your filters.</div></td></tr>`;
}

//  Entrapment Tracker 
function renderTrap(){
  const yr=getYr();
  const data=load().filter(r=>r.date.startsWith(yr)&&r.issue==='Entrapment');
  document.getElementById('trap-sub').textContent=`Passenger entrapments for ${yr}`;
  document.getElementById('tr-tot').textContent=data.length;
  document.getElementById('tr-op').textContent=data.filter(r=>r.status==='Open').length;
  document.getElementById('tr-re').textContent=data.filter(r=>r.status==='Resolved').length;
  const ec={};ELEVS.forEach(l=>ec[l]=0);data.forEach(r=>ec[r.elevator]=(ec[r.elevator]||0)+1);
  const nz=Object.entries(ec).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const maxE=Math.max(1,...nz.map(([,v])=>v));
  document.getElementById('trap-bars').innerHTML=nz.length
    ?nz.map(([l,v])=>`<div class="br"><div class="bl">Elev ${l}</div><div class="bt"><div class="bf re" style="width:${Math.round(v/maxE*100)}%"></div></div><div class="bc">${v}</div></div>`).join('')
    :'<div style="color:var(--tx3);font-size:13px;padding:6px">No entrapments recorded for this year.</div>';
  data.sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('trap-body').innerHTML=data.length
    ?data.map(r=>`<tr><td>${r.id}</td><td>${r.date}</td><td>${r.building||'-'}</td><td>Elev ${r.elevator}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description||'-'}</td><td><span class="badge ${sClass(r.status)}">${r.status}</span></td><td style="color:var(--tx3)">${r.notes||'-'}</td></tr>`).join('')
    :`<tr><td colspan="7"><div class="nd"><i class="ti ti-circle-check"></i>No entrapments this year.</div></td></tr>`;
}

//  Download page 
function renderDL(){
  const yr=getYr();
  const data=load().filter(r=>r.date.startsWith(yr));
  document.getElementById('dl-tot').textContent=data.length;
  document.getElementById('dl-tr').textContent=data.filter(r=>r.issue==='Entrapment').length;
  document.getElementById('dl-op').textContent=data.filter(r=>r.status==='Open').length;
}

//  Excel Export with embedded charts 
function exportXLSX(){
  const yr=getYr();
  const data=load().filter(r=>r.date.startsWith(yr));
  const btn=document.getElementById('xl-btn');
  const status=document.getElementById('xl-status');
  btn.disabled=true;
  status.className='xl-status loading';
  status.textContent='Building workbook with charts...';

  try{
    const WB=XLSX.utils.book_new();

    //  Sheet 1: Incident Log 
    const logRows=data.map(r=>({'ID':r.id,'Date':r.date,'Building':r.building||'','Elevator':'Elevator '+r.elevator,'Issue Type':r.issue,'Description':r.description||'','Status':r.status,'Resolution Notes':r.notes||''}));
    const wsLog=XLSX.utils.json_to_sheet(logRows.length?logRows:[{'Note':'No incidents for '+yr}]);
    wsLog['!cols']=[{wch:6},{wch:12},{wch:20},{wch:13},{wch:20},{wch:42},{wch:14},{wch:30}];
    wsLog['!freeze']={xSplit:0,ySplit:1};
    XLSX.utils.book_append_sheet(WB,wsLog,'Incident_Log');

    //  Sheet 2: Entrapments 
    const trapRows=data.filter(r=>r.issue==='Entrapment').map(r=>({'ID':r.id,'Date':r.date,'Building':r.building||'','Elevator':'Elevator '+r.elevator,'Description':r.description||'','Status':r.status,'Resolution Notes':r.notes||''}));
    const wsTrap=XLSX.utils.json_to_sheet(trapRows.length?trapRows:[{'Note':'No entrapments for '+yr}]);
    wsTrap['!cols']=[{wch:6},{wch:12},{wch:20},{wch:13},{wch:42},{wch:14},{wch:30}];
    XLSX.utils.book_append_sheet(WB,wsTrap,'Entrapments');

    //  Sheet 3: Monthly Summary 
    const mc={};for(let i=0;i<12;i++)mc[i]={Month:MOSL[i],'Total Incidents':0,'Entrapments':0,'Open':0,'In Progress':0,'Resolved':0};
    data.forEach(r=>{const m=parseInt(r.date.slice(5,7))-1;mc[m]['Total Incidents']++;if(r.issue==='Entrapment')mc[m]['Entrapments']++;mc[m][r.status]=(mc[m][r.status]||0)+1});
    const wsMo=XLSX.utils.json_to_sheet(Object.values(mc));
    wsMo['!cols']=[{wch:14},{wch:16},{wch:14},{wch:10},{wch:13},{wch:10}];
    XLSX.utils.book_append_sheet(WB,wsMo,'Monthly_Summary');

    //  Sheet 4: Chart_Data (hidden source data for charts) 
    const ec={};ELEVS.forEach(l=>ec[l]=0);data.forEach(r=>ec[r.elevator]=(ec[r.elevator]||0)+1);
    const ic={};ISSUES.forEach(t=>ic[t]=0);data.forEach(r=>ic[r.issue]=(ic[r.issue]||0)+1);
    const mCounts=Object.values(mc).map(r=>r['Total Incidents']);

    // Chart data sheet layout:
    // A1:B12  = Elevator data (label | count)
    // C1:D8   = Issue type data (label | count)
    // E1:F13  = Monthly trend data (label | count)
    const chartDataAoA=[
      ['Elevator','Incidents',  'Issue Type','Count',       'Month','Incidents'],
      ['Elevator A',ec['A'],    'Entrapment',ic['Entrapment'],       MOS[0],mCounts[0]],
      ['Elevator B',ec['B'],    'Door Issue',ic['Door Issue'],       MOS[1],mCounts[1]],
      ['Elevator C',ec['C'],    'Mechanical Failure',ic['Mechanical Failure'], MOS[2],mCounts[2]],
      ['Elevator D',ec['D'],    'Power Outage',ic['Power Outage'],   MOS[3],mCounts[3]],
      ['Elevator E',ec['E'],    'Inspection Issue',ic['Inspection Issue'], MOS[4],mCounts[4]],
      ['Elevator F',ec['F'],    'Noise/Vibration',ic['Noise/Vibration'], MOS[5],mCounts[5]],
      ['Elevator G',ec['G'],    'Other',ic['Other'],                 MOS[6],mCounts[6]],
      ['Elevator H',ec['H'],    '','',                               MOS[7],mCounts[7]],
      ['Elevator I',ec['I'],    '','',                               MOS[8],mCounts[8]],
      ['Elevator J',ec['J'],    '','',                               MOS[9],mCounts[9]],
      ['Elevator K',ec['K'],    '','',                               MOS[10],mCounts[10]],
      ['','',                   '','',                               MOS[11],mCounts[11]],
    ];
    const wsCD=XLSX.utils.aoa_to_sheet(chartDataAoA);
    wsCD['!cols']=[{wch:14},{wch:10},{wch:2},{wch:20},{wch:10},{wch:2},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(WB,wsCD,'Chart_Data');

    //  Sheet 5: Dashboard (KPIs + charts anchored here) 
    const trap=data.filter(r=>r.issue==='Entrapment').length;
    const topE=Object.entries(ec).sort((a,b)=>b[1]-a[1])[0];
    const dashAoA=[
      [`LiftLog Annual Report - ${yr}`,'','','','','','','','','','','','','','',''],
      [''],
      ['METRIC','VALUE'],
      ['Total Incidents',data.length],
      ['Entrapments',trap],
      ['Other Incidents',data.length-trap],
      ['Open Cases',data.filter(r=>r.status==='Open').length],
      ['In Progress',data.filter(r=>r.status==='In Progress').length],
      ['Resolved',data.filter(r=>r.status==='Resolved').length],
      ['Elevator With Most Incidents',topE&&topE[1]>0?`Elevator ${topE[0]} (${topE[1]} incidents)`:'N/A'],
    ];
    const wsDash=XLSX.utils.aoa_to_sheet(dashAoA);
    wsDash['!cols']=[{wch:30},{wch:22},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2},{wch:2}];
    XLSX.utils.book_append_sheet(WB,wsDash,'Dashboard');

    //  Inject chart XML into the workbook zip 
    // SheetJS writes the workbook; we then patch the zip to add chart parts.
    // Charts reference Chart_Data sheet (sheet index 3, xl/worksheets/sheet4.xml)

    // Bar chart: Incidents by Elevator (Chart_Data A2:B12)
    const barChartXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Incidents by Elevator</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>Chart_Data!$B$1</c:f></c:strRef></c:tx>
          <c:cat><c:strRef><c:f>Chart_Data!$A$2:$A$12</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>Chart_Data!$B$2:$B$12</c:f></c:numRef></c:val>
        </c:ser>
        <c:axId val="1"/><c:axId val="2"/>
      </c:barChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="1"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
  </c:chart>
</c:chartSpace>`;

    // Pie chart: Issue Type Breakdown (Chart_Data C2:D8)
    const pieChartXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Incidents by Issue Type</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:pieChart>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>Chart_Data!$D$1</c:f></c:strRef></c:tx>
          <c:cat><c:strRef><c:f>Chart_Data!$C$2:$C$8</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>Chart_Data!$D$2:$D$8</c:f></c:numRef></c:val>
        </c:ser>
        <c:firstSliceAng val="0"/>
      </c:pieChart>
    </c:plotArea>
    <c:legend><c:legendPos val="r"/></c:legend>
  </c:chart>
</c:chartSpace>`;

    // Line chart: Monthly Trend (Chart_Data E2:F13)
    const lineChartXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Monthly Incident Trend</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>Chart_Data!$F$1</c:f></c:strRef></c:tx>
          <c:cat><c:strRef><c:f>Chart_Data!$E$2:$E$13</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>Chart_Data!$F$2:$F$13</c:f></c:numRef></c:val>
          <c:marker><c:symbol val="circle"/></c:marker>
          <c:smooth val="0"/>
        </c:ser>
        <c:axId val="1"/><c:axId val="2"/>
      </c:lineChart>
      <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="2"/></c:catAx>
      <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="1"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
  </c:chart>
</c:chartSpace>`;

    // Drawing XML: anchors 3 charts onto the Dashboard sheet
    const drawingXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>11</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>10</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>27</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="2" name="Bar Chart"/><xdr:cNvGraphicFramePr/>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId1"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>11</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>11</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>18</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>27</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="3" name="Pie Chart"/><xdr:cNvGraphicFramePr/>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId2"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>28</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>18</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>43</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr>
      <xdr:cNvPr id="4" name="Line Chart"/><xdr:cNvGraphicFramePr/>
    </xdr:nvGraphicFramePr>
    <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
    <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId3"/>
    </a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;

    // Relationships for the drawing (links drawing  chart files)
    const drawingRelsXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart3.xml"/>
</Relationships>`;

    // Write base workbook to zip, then patch in chart files
    const wbOut=XLSX.write(WB,{type:'binary',bookType:'xlsx'});

    // Convert binary string  Uint8Array for JSZip
    const s2ab=s=>{const b=new ArrayBuffer(s.length);const v=new Uint8Array(b);for(let i=0;i<s.length;i++)v[i]=s.charCodeAt(i)&0xFF;return b};

    // We need JSZip to patch the xlsx zip - load it dynamically
    const script=document.createElement('script');
    script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    script.onload=async()=>{
      const zip=await JSZip.loadAsync(s2ab(wbOut));

      // Find which sheet number is the Dashboard (last sheet = index 4, 1-based)
      // SheetJS names sheets sheet1.xml, sheet2.xml ... in order added
      // Order: Incident_Log=1, Entrapments=2, Monthly_Summary=3, Chart_Data=4, Dashboard=5
      const dashSheetFile='xl/worksheets/sheet5.xml';
      const dashRelsDir='xl/worksheets/_rels/sheet5.xml.rels';

      // Patch the Dashboard sheet XML to reference the drawing
      let dashXml=await zip.file(dashSheetFile).async('string');
      if(!dashXml.includes('xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')){
        dashXml=dashXml.replace('<worksheet ','<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      }
      if(!dashXml.includes('<drawing')){
        dashXml=dashXml.replace('</worksheet>','<drawing r:id="rId100"/></worksheet>');
        zip.file(dashSheetFile,dashXml);
      }

      // Add/update the Dashboard sheet's .rels to include the drawing relationship
      let dashRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId100" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
      zip.file(dashRelsDir,dashRels);

      // Add chart files
      zip.file('xl/charts/chart1.xml',barChartXml);
      zip.file('xl/charts/chart2.xml',pieChartXml);
      zip.file('xl/charts/chart3.xml',lineChartXml);

      // Add drawing file and its rels
      zip.file('xl/drawings/drawing1.xml',drawingXml);
      zip.file('xl/drawings/_rels/drawing1.xml.rels',drawingRelsXml);

      // Patch [Content_Types].xml to register new parts
      let ct=await zip.file('[Content_Types].xml').async('string');
      const ctPatches=[
        ['xl/charts/chart1.xml','application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
        ['xl/charts/chart2.xml','application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
        ['xl/charts/chart3.xml','application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
        ['xl/drawings/drawing1.xml','application/vnd.openxmlformats-officedocument.drawing+xml'],
      ];
      ctPatches.forEach(([pn,ct_])=>{
        if(!ct.includes(pn)){
          ct=ct.replace('</Types>',`<Override PartName="/${pn}" ContentType="${ct_}"/></Types>`);
        }
      });
      zip.file('[Content_Types].xml',ct);

      // Generate final blob and trigger download
      const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`LiftLog_${yr}_Report.xlsx`;
      a.click();

      status.className='xl-status done';
      status.textContent=`LiftLog_${yr}_Report.xlsx downloaded - open in Excel to see charts.`;
      btn.disabled=false;
    };
    script.onerror=()=>{
      status.className='xl-status fail';
      status.textContent='Could not load JSZip. Check your internet connection.';
      btn.disabled=false;
    };
    document.head.appendChild(script);
    return; // async path handles btn.disabled
  }catch(e){
    status.className='xl-status fail';
    status.textContent='Export failed: '+e.message;
    btn.disabled=false;
  }
}

//  CSV fallback 
function exportCSV(){
  const yr=getYr();
  const data=load().filter(r=>r.date.startsWith(yr));
  const hdr=['ID','Date','Building','Elevator','Issue Type','Description','Status','Resolution Notes'];
  const esc=v=>typeof v==='string'&&(v.includes(',')||v.includes('"'))?`"${v.replace(/"/g,'""')}"`:(v||'');
  const rows=data.map(r=>[r.id,r.date,esc(r.building||''),'Elevator '+r.elevator,r.issue,esc(r.description||''),r.status,esc(r.notes||'')]);
  const csv=[hdr.join(','),...rows.map(r=>r.join(','))].join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`LiftLog_${yr}.csv`;a.click();
}

//  Save Incident 
function saveInc(){
  const date=document.getElementById('f-date').value;
  const bld=document.getElementById('f-bld').value.trim();
  const elev=document.getElementById('f-elev').value.replace('Elevator ','');
  const issue=document.getElementById('f-issue').value;
  const stat=document.getElementById('f-stat').value;
  const desc=document.getElementById('f-desc').value.trim();
  const notes=document.getElementById('f-notes').value.trim();
  const toast=document.getElementById('add-toast');
  if(!date||!bld){
    toast.className='toast err show';toast.textContent='Please fill in Date and Building.';
    setTimeout(()=>toast.classList.remove('show'),3000);return;
  }
  const data=load();
  const id=data.length?Math.max(...data.map(r=>r.id))+1:1;
  data.push({id,date,building:bld,elevator:elev,issue,description:desc,status:stat,notes,created:new Date().toISOString()});
  save(data);
  toast.className='toast ok show';toast.textContent=`Saved: Elevator ${elev} - ${issue} on ${date}`;
  setTimeout(()=>toast.classList.remove('show'),3500);
  document.getElementById('f-bld').value='';document.getElementById('f-desc').value='';document.getElementById('f-notes').value='';
  initYrDrop();refresh();
}

//  Init filters 
function initFilters(){
  document.getElementById('f-elev').innerHTML=ELEVS.map(l=>`<option>Elevator ${l}</option>`).join('');
  document.getElementById('f-issue').innerHTML=ISSUES.map(t=>`<option>${t}</option>`).join('');
  const yrs=buildYearList();
  document.getElementById('lf-yr').innerHTML='<option value="">All Years</option>'+yrs.map(y=>`<option value="${y}">${y}</option>`).join('');
  document.getElementById('lf-mo').innerHTML='<option value="">All Months</option>'+MOSL.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  document.getElementById('lf-el').innerHTML='<option value="">All Elevators</option>'+ELEVS.map(l=>`<option value="${l}">Elevator ${l}</option>`).join('');
  document.getElementById('lf-is').innerHTML='<option value="">All Issue Types</option>'+ISSUES.map(t=>`<option>${t}</option>`).join('');
  document.getElementById('lf-st').innerHTML='<option value="">All Statuses</option>'+STATS.map(s=>`<option>${s}</option>`).join('');
  document.getElementById('f-date').value=new Date().toISOString().slice(0,10);
}

//  Boot 
if(!localStorage.getItem('liftlog_cleared_v1')){
  localStorage.removeItem('liftlog2');
  localStorage.setItem('liftlog_cleared_v1','1');
}
initYrDrop();
initFilters();
renderDash();
renderLog();
renderTrap();
renderDL();