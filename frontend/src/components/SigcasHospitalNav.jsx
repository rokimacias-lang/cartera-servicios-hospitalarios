import React from 'react';
const tabs=[['catalogo','Catálogo Maestro'],['cartera','Mi Cartera'],['capacidad','Capacidad Instalada'],['documentos','Documentos']];
export default function SigcasHospitalNav({active,onChange}){return <nav aria-label="Módulo hospitalario SIGCAS" style={{display:'flex',gap:6,flexWrap:'wrap',margin:'14px 0'}}>{tabs.map(([id,label])=><button type="button" key={id} onClick={()=>onChange(id)} className={active===id?'csh-btn':'csh-logout'}>{label}</button>)}</nav>}
