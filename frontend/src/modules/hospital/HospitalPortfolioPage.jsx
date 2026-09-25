import { useEffect, useState } from 'react';
import { sigcasApi } from '../../api/sigcasApi.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import SigcasHospitalNav from '../../components/SigcasHospitalNav.jsx';
import MiCarteraCatalog from '../../components/MiCarteraCatalog.jsx';
import MiCarteraDynamicForm from '../../components/MiCarteraDynamicForm.jsx';
import MiCarteraSummary from '../../components/MiCarteraSummary.jsx';
import CapacidadInstaladaPanel from '../../components/CapacidadInstaladaPanel.jsx';
import DocumentosGestionPanel from '../../components/DocumentosGestionPanel.jsx';
import AdministrativeInstitutionForm from '../../components/AdministrativeInstitutionForm.jsx';

export function HospitalPortfolioPage(){
 const {profile}=useAuth(); const [tab,setTab]=useState('catalogo'); const [selected,setSelected]=useState(null); const [showAdmin,setShowAdmin]=useState(false); const [toast,setToast]=useState('');
 const establishmentId=profile?.establecimiento_id||null; const [cartera,setCartera]=useState(null); const [loadingCartera,setLoadingCartera]=useState(false); const [creating,setCreating]=useState(false); const [saving,setSaving]=useState(false); const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{if(!establishmentId)return;let active=true;setLoadingCartera(true);sigcasApi.getCarteraActiva(establishmentId).then(x=>active&&setCartera(x)).catch(e=>active&&notify(e.message)).finally(()=>active&&setLoadingCartera(false));return()=>{active=false}},[establishmentId]);
 const notify=(msg)=>{setToast(msg);window.setTimeout(()=>setToast(''),3500)};
 const saveItem=async(payload)=>{if(!cartera?.id){notify('Primero debe crear una cartera BORRADOR.');setTab('cartera');return;}try{setSaving(true);await sigcasApi.saveCarteraItem(cartera.id,payload);setRefreshKey(v=>v+1);notify('Prestación guardada correctamente en Mi Cartera.');}catch(e){notify(e.message)}finally{setSaving(false)}};
 const createDraft=async()=>{try{setCreating(true);const next=await sigcasApi.createCartera(establishmentId);setCartera(next);notify('Cartera BORRADOR creada correctamente.');}catch(e){notify(e.message)}finally{setCreating(false)}};
 if(!establishmentId)return <section><h1>Cartera hospitalaria</h1><div className="card"><p>Este módulo requiere un perfil con establecimiento asignado.</p></div></section>;
 return <section><div className="eyebrow">Configuración institucional</div><h1>Cartera de Servicios</h1><p className="lead">Configure la oferta, capacidad instalada y documentos de gestión del establecimiento.</p>
 <div className="card"><SigcasHospitalNav active={tab} onChange={setTab}/></div>
 {tab==='catalogo'&&<div className="card"><MiCarteraCatalog onAdministrative={()=>{setSelected(null);setShowAdmin(true)}} onSelect={({item})=>{setShowAdmin(false);setSelected(item)}}/>{showAdmin&&<AdministrativeInstitutionForm typology={profile?.tipologia||profile?.establecimiento_tipologia||''}/>} {selected&&<MiCarteraDynamicForm item={selected} onReady={saveItem}/>} {saving&&<p>Guardando configuración...</p>}</div>}
 {tab==='cartera'&&<div className="card">{loadingCartera?<p>Cargando cartera...</p>:cartera?<><p><strong>Periodo:</strong> {cartera.periodo} · <strong>Versión:</strong> {cartera.version} · <strong>Estado:</strong> {cartera.estado}</p><MiCarteraSummary carteraId={cartera.id} refreshKey={refreshKey}/></>:<><p>No existe una cartera BORRADOR u OBSERVADA activa para este establecimiento.</p><button className="button" disabled={creating} onClick={createDraft}>{creating?'Creando...':'Crear cartera BORRADOR'}</button></>}</div>}
 {tab==='capacidad'&&<div className="card"><CapacidadInstaladaPanel readOnly onReady={(_ok,msg)=>notify(msg)}/></div>}
 {tab==='documentos'&&<div className="card"><DocumentosGestionPanel readOnly onReady={(_ok,msg)=>notify(msg)}/></div>}
 {toast&&<div className="notice">{toast}</div>}</section>;
}
