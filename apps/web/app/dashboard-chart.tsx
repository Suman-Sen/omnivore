import type {ProfilePreferences} from '../../../packages/domain/local-profile';

export default function DashboardChart({widget,data,preferences,busy,onPreferences}:{widget:'tasks'|'calendar'|'goals'|'journal';data:{label:string;value:number}[];preferences:ProfilePreferences;busy:boolean;onPreferences:(patch:Partial<ProfilePreferences>)=>Promise<void>}){

 const mode=preferences.dashboardCharts[widget]??'number',total=data.reduce((sum,row)=>sum+row.value,0),max=Math.max(1,...data.map(row=>row.value));

 const colors=['var(--accent,#264c40)','#849ed4','#c384a5','#d8ad64','#91b998'];

 const stops=data.map((row,i)=>{const start=total?data.slice(0,i).reduce((sum,r)=>sum+r.value,0)/total*100:0;const offset=start+(total?row.value/total*100:0);return `${colors[i%colors.length]} ${start}% ${offset}%`;});

 return <div className="dashboard-chart"><label>{widget} chart<select value={mode} disabled={busy} onChange={e=>void onPreferences({dashboardCharts:{...preferences.dashboardCharts,[widget]:e.target.value as 'number'|'bar'|'pie'|'donut'}})}><option value="number">Number</option><option value="bar">Bar chart</option><option value="pie">Pie chart</option><option value="donut">Donut chart</option></select></label>{mode!=='number'&&<><p className="note">{widget==='tasks'?'Task status now · all saved tasks':widget==='goals'?'Goal status now · all saved goals': 'Records in the selected date range'}</p>{total===0?<p>No data to chart yet.</p>:<><div role="img" aria-label={data.map(row=>row.label+': '+row.value).join(', ')}>{mode==='bar'?<div className="chart-bars">{data.map((row,i)=><div key={row.label}><span>{row.label}: {row.value}</span><div className="chart-track"><div style={{width:`${row.value/max*100}%`,background:colors[i%colors.length]}}/></div></div>)}</div>:<div className={'chart-circle '+mode} style={{background:`conic-gradient(${stops.join(',')})`}}>{mode==='donut'&&<span>{total}</span>}</div>}</div><ul className="chart-legend">{data.map((row,i)=><li key={row.label}><i style={{background:colors[i%colors.length]}}/>{row.label}: {row.value} ({Math.round(row.value/total*100)}%)</li>)}</ul></>}</>}</div>;

}

