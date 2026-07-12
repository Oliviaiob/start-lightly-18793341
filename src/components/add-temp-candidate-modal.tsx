import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

export const QUAL_OPTIONS = [
  { value: "unqualified",     label: "Unqualified"     },
  { value: "level_2",         label: "Level 2"         },
  { value: "level_3",         label: "Level 3"         },
  { value: "room_leader",     label: "Room Leader"     },
  { value: "deputy_manager",  label: "Deputy Manager"  },
  { value: "manager",         label: "Manager"         },
];

export function AddTempCandidateModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "manual" | "convert">("upload");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showFullForm, setShowFullForm] = useState(false);

  const emptyFull = () => ({
    first_name:"",last_name:"",email:"",phone:"",date_of_birth:"",ni_number:"",
    qualification_level:"__none__",address_line_1:"",city:"",postcode:"",experience_summary:"",
    has_dbs:false,dbs_update_service:false,dbs_certificate_number:"",has_vehicle:false,
    preferred_fields:[] as string[],available_days:[] as string[],shift_types_available:[] as string[],
    work_ref_1:{referee_name:"",referee_email:"",referee_phone:"",company_name:"",referee_job_title:"",candidate_position:"",employment_start:"",employment_end:"",reason_for_leaving:""},
    work_ref_2:{referee_name:"",referee_email:"",referee_phone:"",company_name:"",referee_job_title:"",candidate_position:"",employment_start:"",employment_end:"",reason_for_leaving:""},
    char_ref:{referee_name:"",referee_email:"",referee_phone:"",company_name:"",relationship:""},
  });
  const [full, setFull] = useState(emptyFull());
  const setF = (k:string,v:any) => setFull(p=>({...p,[k]:v}));
  const setRef1 = (k:string,v:string) => setFull(p=>({...p,work_ref_1:{...p.work_ref_1,[k]:v}}));
  const setRef2 = (k:string,v:string) => setFull(p=>({...p,work_ref_2:{...p.work_ref_2,[k]:v}}));
  const setCharRef = (k:string,v:string) => setFull(p=>({...p,char_ref:{...p.char_ref,[k]:v}}));
  const toggleArr = (field:"preferred_fields"|"available_days"|"shift_types_available",val:string) =>
    setFull(p=>({...p,[field]:p[field].includes(val)?p[field].filter((x:string)=>x!==val):[...p[field],val]}));

  const [form, setForm] = useState({first_name:"",last_name:"",email:"",phone:"",date_of_birth:"",ni_number:"",qualification_level:"__none__",address_line_1:"",city:"",postcode:""});
  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));

  const [permSearch,setPermSearch]=useState("");
  const [permDropOpen,setPermDropOpen]=useState(false);
  const [permCandidates,setPermCandidates]=useState<{id:string;first_name:string|null;last_name:string|null}[]>([]);
  const [selectedPerm,setSelectedPerm]=useState<{id:string;name:string}|null>(null);
  const filteredPerm=permCandidates.filter(c=>`${c.first_name??""} ${c.last_name??""}`.toLowerCase().includes(permSearch.toLowerCase()));

  useEffect(()=>{
    if(!open){setTab("upload");setExtracting(false);setExtractError(null);setShowFullForm(false);setFull(emptyFull());setForm({first_name:"",last_name:"",email:"",phone:"",date_of_birth:"",ni_number:"",qualification_level:"__none__",address_line_1:"",city:"",postcode:""});setSelectedPerm(null);setPermSearch("");}
  },[open]);

  useEffect(()=>{
    if(tab!=="convert")return;
    supabase.from("candidates").select("id,first_name,last_name").in("candidate_type",["perm"]).order("first_name").then(({data})=>setPermCandidates((data as any[])??[]));
  },[tab]);

  const createChecklist=async(candidateId:string)=>{
    const{data:existing}=await supabase.from("compliance_checklists").select("id").eq("candidate_id",candidateId).maybeSingle();
    if(!existing)await supabase.from("compliance_checklists").insert({candidate_id:candidateId});
  };

  const handlePdfUpload=async(file:File)=>{
    setExtracting(true);setExtractError(null);setShowFullForm(false);
    try{
      const arrayBuf=await file.arrayBuffer();const bytes=new Uint8Array(arrayBuf);let binary="";
      for(let i=0;i<bytes.byteLength;i++)binary+=String.fromCharCode(bytes[i]);
      const b64=btoa(binary);
      const{data,error}=await supabase.functions.invoke("extract-registration-form",{body:{pdf_base64:b64}});
      if(error)throw new Error(error.message);
      const d=data?.data??{};
      setFull({first_name:d.first_name??"",last_name:d.last_name??"",email:d.email??"",phone:d.phone??"",date_of_birth:d.date_of_birth??"",ni_number:d.ni_number??"",qualification_level:d.qualification_level??"__none__",address_line_1:d.address_line_1??"",city:d.city??"",postcode:d.postcode??"",experience_summary:d.experience_summary??"",has_dbs:!!d.has_dbs,dbs_update_service:!!d.dbs_update_service,dbs_certificate_number:d.dbs_certificate_number??"",has_vehicle:!!d.has_vehicle,preferred_fields:Array.isArray(d.preferred_fields)?d.preferred_fields:[],available_days:Array.isArray(d.available_days)?d.available_days:[],shift_types_available:Array.isArray(d.shift_types_available)?d.shift_types_available:[],
        work_ref_1:d.work_referee_1?{referee_name:d.work_referee_1.referee_name??"",referee_email:d.work_referee_1.referee_email??"",referee_phone:d.work_referee_1.referee_phone??"",company_name:d.work_referee_1.company_name??"",referee_job_title:d.work_referee_1.referee_job_title??"",candidate_position:d.work_referee_1.candidate_position??"",employment_start:d.work_referee_1.employment_start??"",employment_end:d.work_referee_1.employment_end??"",reason_for_leaving:d.work_referee_1.reason_for_leaving??""}:emptyFull().work_ref_1,
        work_ref_2:d.work_referee_2?{referee_name:d.work_referee_2.referee_name??"",referee_email:d.work_referee_2.referee_email??"",referee_phone:d.work_referee_2.referee_phone??"",company_name:d.work_referee_2.company_name??"",referee_job_title:d.work_referee_2.referee_job_title??"",candidate_position:d.work_referee_2.candidate_position??"",employment_start:d.work_referee_2.employment_start??"",employment_end:d.work_referee_2.employment_end??"",reason_for_leaving:d.work_referee_2.reason_for_leaving??""}:emptyFull().work_ref_2,
        char_ref:d.character_referee?{referee_name:d.character_referee.referee_name??"",referee_email:d.character_referee.referee_email??"",referee_phone:d.character_referee.referee_phone??"",company_name:d.character_referee.company_name??"",relationship:d.character_referee.relationship??""}:emptyFull().char_ref,
      });
      toast.success("Form data extracted — review and confirm below");
    }catch(e:any){setExtractError("Couldn't extract automatically. Please fill in the form below.");setFull(emptyFull());}
    setExtracting(false);setShowFullForm(true);
  };

  const saveFromForm=async()=>{
    if(!full.first_name||!full.last_name||!full.email){toast.error("First name, last name and email are required");return;}
    setSaving(true);
    const{data:cand,error}=await supabase.from("candidates").insert({first_name:full.first_name,last_name:full.last_name,email:full.email||null,phone:full.phone||null,date_of_birth:full.date_of_birth||null,ni_number:full.ni_number||null,qualification_level:full.qualification_level==="__none__"?null:full.qualification_level,address_line1:full.address_line_1||null,city:full.city||null,postcode:full.postcode||null,experience_summary:full.experience_summary||null,has_dbs:full.has_dbs,dbs_update_service:full.dbs_update_service,dbs_certificate_number:full.dbs_certificate_number||null,preferred_fields:full.preferred_fields.length?full.preferred_fields:null,available_days:full.available_days.length?full.available_days:null,shift_types_available:full.shift_types_available.length?full.shift_types_available:null,candidate_type:"temp",status_temp:"pending_compliance"}).select("id").single();
    if(error){toast.error("Failed: "+error.message);setSaving(false);return;}
    await createChecklist(cand.id);
    const refs=[full.work_ref_1.referee_name?{...full.work_ref_1,candidate_id:cand.id,ref_type:"work",ref_number:1,status:"pending",unique_token:crypto.randomUUID()}:null,full.work_ref_2.referee_name?{...full.work_ref_2,candidate_id:cand.id,ref_type:"work",ref_number:2,status:"pending",unique_token:crypto.randomUUID()}:null,full.char_ref.referee_name?{referee_name:full.char_ref.referee_name,referee_email:full.char_ref.referee_email,referee_phone:full.char_ref.referee_phone,company_name:full.char_ref.company_name,relationship_to_candidate:full.char_ref.relationship,candidate_id:cand.id,ref_type:"character",ref_number:1,status:"pending",unique_token:crypto.randomUUID()}:null].filter(Boolean);
    if(refs.length)await supabase.from("references").insert(refs as any[]);
    toast.success(`${full.first_name} ${full.last_name} added`);
    setSaving(false);onCreated();
  };

  const saveManual=async()=>{
    if(!form.first_name||!form.last_name||!form.email){toast.error("Name and email required");return;}
    setSaving(true);
    const{data,error}=await supabase.from("candidates").insert({first_name:form.first_name,last_name:form.last_name,email:form.email||null,phone:form.phone||null,date_of_birth:form.date_of_birth||null,ni_number:form.ni_number||null,qualification_level:form.qualification_level==="__none__"?null:form.qualification_level,address_line1:form.address_line_1||null,city:form.city||null,postcode:form.postcode||null,candidate_type:"temp",status_temp:"pending_compliance"}).select("id").single();
    if(error){toast.error("Failed: "+error.message);setSaving(false);return;}
    await createChecklist(data.id);
    toast.success("Candidate created");setSaving(false);onCreated();
  };

  const saveConvert=async()=>{
    if(!selectedPerm){toast.error("Select a candidate");return;}
    setSaving(true);
    await supabase.from("candidates").update({candidate_type:"both",status_temp:"pending_compliance"}).eq("id",selectedPerm.id);
    await createChecklist(selectedPerm.id);
    toast.success(`${selectedPerm.name} added to temp compliance`);setSaving(false);onCreated();
  };

  const F=({label,children,span2=false}:{label:string;children:React.ReactNode;span2?:boolean})=>(
    <div className={`space-y-1 ${span2?"col-span-2":""}`}><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>
  );
  const CheckToggle=({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void})=>(
    <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-4 w-4 rounded accent-teal"/><span className="text-sm">{label}</span></label>
  );
  const ChipGroup=({options,field}:{options:string[];field:"preferred_fields"|"available_days"|"shift_types_available"})=>(
    <div className="flex flex-wrap gap-2">{options.map(o=>(<button key={o} type="button" onClick={()=>toggleArr(field,o)} className={`h-7 px-3 rounded-lg border text-xs font-medium transition-colors ${full[field].includes(o)?"bg-navy text-white border-navy":"bg-background text-muted-foreground hover:border-gray-300"}`}>{o}</button>))}</div>
  );

  return (
    <Dialog open={open} onOpenChange={o=>!o&&onClose()}>
      <DialogContent className={`${showFullForm?"max-w-2xl max-h-[90vh] overflow-y-auto":"max-w-lg"}`}>
        <DialogHeader><DialogTitle>Add Temp Candidate</DialogTitle><DialogDescription>Add a candidate to the compliance pipeline.</DialogDescription></DialogHeader>
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 mt-1">
          {([{key:"upload" as const,label:"Upload Form",Icon:Upload},{key:"manual" as const,label:"Enter Manually",Icon:User},{key:"convert" as const,label:"Convert Perm",Icon:RefreshCw}]).map(({key,label,Icon})=>(
            <button key={key} onClick={()=>setTab(key)} className={`flex-1 h-8 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${tab===key?"bg-card shadow text-foreground":"text-muted-foreground hover:text-foreground"}`}><Icon className="h-3.5 w-3.5"/>{label}</button>
          ))}
        </div>

        {tab==="upload"&&!showFullForm&&(
          <div className="space-y-4 mt-1">
            {extracting?(
              <div className="flex flex-col items-center justify-center py-12 gap-3"><div className="h-8 w-8 border-2 border-teal border-t-transparent rounded-full animate-spin"/><p className="text-sm text-muted-foreground">Extracting form data…</p></div>
            ):(
              <>
                <p className="text-xs text-muted-foreground">Upload the candidate's completed SOAR registration form. We'll extract all details automatically.</p>
                <label className="block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-colors">
                  <input type="file" accept=".pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handlePdfUpload(f);}}/>
                  <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2"/>
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">SOAR temp registration form</p>
                </label>
              </>
            )}
          </div>
        )}

        {tab==="upload"&&showFullForm&&(
          <div className="space-y-5 mt-2">
            {extractError&&<div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">{extractError}</div>}
            <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <F label="First name *"><Input value={full.first_name} onChange={e=>setF("first_name",e.target.value)} className="h-9"/></F>
                <F label="Last name *"><Input value={full.last_name} onChange={e=>setF("last_name",e.target.value)} className="h-9"/></F>
                <F label="Email *" span2><Input type="email" value={full.email} onChange={e=>setF("email",e.target.value)} className="h-9"/></F>
                <F label="Phone"><Input value={full.phone} onChange={e=>setF("phone",e.target.value)} className="h-9"/></F>
                <F label="Date of birth"><Input type="date" value={full.date_of_birth} onChange={e=>setF("date_of_birth",e.target.value)} className="h-9"/></F>
                <F label="NI number"><Input value={full.ni_number} onChange={e=>setF("ni_number",e.target.value)} className="h-9"/></F>
                <F label="Qualification"><Select value={full.qualification_level} onValueChange={v=>setF("qualification_level",v)}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__none__">— Select —</SelectItem>{QUAL_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></F>
                <F label="Postcode"><Input value={full.postcode} onChange={e=>setF("postcode",e.target.value)} className="h-9"/></F>
                <F label="Address" span2><Input value={full.address_line_1} onChange={e=>setF("address_line_1",e.target.value)} placeholder="Address line 1" className="h-9"/></F>
                <F label="City"><Input value={full.city} onChange={e=>setF("city",e.target.value)} className="h-9"/></F>
              </div>
              <F label="Experience summary"><textarea value={full.experience_summary} onChange={e=>setF("experience_summary",e.target.value)} rows={2} className="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"/></F>
            </div>
            <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DBS</h3>
              <div className="flex gap-6"><CheckToggle label="Has DBS" checked={full.has_dbs} onChange={v=>setF("has_dbs",v)}/><CheckToggle label="DBS Update Service" checked={full.dbs_update_service} onChange={v=>setF("dbs_update_service",v)}/><CheckToggle label="Has Vehicle" checked={full.has_vehicle} onChange={v=>setF("has_vehicle",v)}/></div>
              {full.has_dbs&&<F label="DBS Certificate Number"><Input value={full.dbs_certificate_number} onChange={e=>setF("dbs_certificate_number",e.target.value)} className="h-9"/></F>}
            </div>
            <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Availability</h3>
              <F label="Preferred fields"><ChipGroup options={["Nurseries","Pre-schools","Schools & Education","SEND","Children's support","Private families","Other"]} field="preferred_fields"/></F>
              <F label="Available days"><ChipGroup options={["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]} field="available_days"/></F>
              <F label="Shift types"><ChipGroup options={["Full days","Overnight stays","Term-time only","Lunch cover only","Evening shifts","Weekends","School hours only"]} field="shift_types_available"/></F>
            </div>
            {[{title:"Work Referee 1",setR:setRef1,r:full.work_ref_1},{title:"Work Referee 2",setR:setRef2,r:full.work_ref_2}].map(({title,setR,r})=>(
              <div key={title} className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Name"><Input value={r.referee_name} onChange={e=>setR("referee_name",e.target.value)} className="h-9"/></F>
                  <F label="Email"><Input value={r.referee_email} onChange={e=>setR("referee_email",e.target.value)} className="h-9"/></F>
                  <F label="Phone"><Input value={r.referee_phone} onChange={e=>setR("referee_phone",e.target.value)} className="h-9"/></F>
                  <F label="Company"><Input value={r.company_name} onChange={e=>setR("company_name",e.target.value)} className="h-9"/></F>
                  <F label="Their position"><Input value={r.referee_job_title} onChange={e=>setR("referee_job_title",e.target.value)} className="h-9"/></F>
                  <F label="Candidate's position"><Input value={r.candidate_position} onChange={e=>setR("candidate_position",e.target.value)} className="h-9"/></F>
                  <F label="Start date"><Input type="date" value={r.employment_start} onChange={e=>setR("employment_start",e.target.value)} className="h-9"/></F>
                  <F label="End date"><Input type="date" value={r.employment_end} onChange={e=>setR("employment_end",e.target.value)} className="h-9"/></F>
                  <F label="Reason for leaving" span2><Input value={r.reason_for_leaving} onChange={e=>setR("reason_for_leaving",e.target.value)} className="h-9"/></F>
                </div>
              </div>
            ))}
            <div className="space-y-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Character Referee</h3>
              <div className="grid grid-cols-2 gap-3">
                <F label="Name"><Input value={full.char_ref.referee_name} onChange={e=>setCharRef("referee_name",e.target.value)} className="h-9"/></F>
                <F label="Email"><Input value={full.char_ref.referee_email} onChange={e=>setCharRef("referee_email",e.target.value)} className="h-9"/></F>
                <F label="Phone"><Input value={full.char_ref.referee_phone} onChange={e=>setCharRef("referee_phone",e.target.value)} className="h-9"/></F>
                <F label="Company"><Input value={full.char_ref.company_name} onChange={e=>setCharRef("company_name",e.target.value)} className="h-9"/></F>
                <F label="Relationship" span2><Input value={full.char_ref.relationship} onChange={e=>setCharRef("relationship",e.target.value)} className="h-9"/></F>
              </div>
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t sticky bottom-0 bg-background py-3">
              <button onClick={()=>setShowFullForm(false)} className="h-10 px-4 rounded-full border text-sm font-medium hover:bg-muted">← Back</button>
              <div className="flex gap-3">
                <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={saveFromForm} disabled={saving} className="h-10 px-6 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving?"Creating…":"Create candidate"}</button>
              </div>
            </div>
          </div>
        )}

        {tab==="manual"&&(
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">First name *</label><Input value={form.first_name} onChange={e=>set("first_name",e.target.value)} className="h-10"/></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Last name *</label><Input value={form.last_name} onChange={e=>set("last_name",e.target.value)} className="h-10"/></div>
              <div className="space-y-1 col-span-2"><label className="text-xs font-medium text-muted-foreground">Email *</label><Input type="email" value={form.email} onChange={e=>set("email",e.target.value)} className="h-10"/></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={form.phone} onChange={e=>set("phone",e.target.value)} className="h-10"/></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Date of birth</label><Input type="date" value={form.date_of_birth} onChange={e=>set("date_of_birth",e.target.value)} className="h-10"/></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">NI number</label><Input value={form.ni_number} onChange={e=>set("ni_number",e.target.value)} className="h-10"/></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Qualification</label><Select value={form.qualification_level} onValueChange={v=>set("qualification_level",v)}><SelectTrigger className="h-10"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__none__">— Select —</SelectItem>{QUAL_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1 col-span-2"><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={form.address_line_1} onChange={e=>set("address_line_1",e.target.value)} placeholder="Address line 1" className="h-10"/></div>
              <div className="space-y-1"><Input value={form.city} onChange={e=>set("city",e.target.value)} placeholder="City" className="h-10"/></div>
              <div className="space-y-1"><Input value={form.postcode} onChange={e=>set("postcode",e.target.value)} placeholder="Postcode" className="h-10"/></div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveManual} disabled={saving} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving?"Creating…":"Create candidate"}</button>
            </div>
          </div>
        )}

        {tab==="convert"&&(
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">Select an existing permanent candidate to add to the temp compliance pipeline.</p>
            <div className="relative">
              {selectedPerm&&!permDropOpen
                ?<div className="h-10 px-3 rounded-lg border bg-background flex items-center justify-between text-sm cursor-pointer hover:bg-muted/40" onClick={()=>{setPermDropOpen(true);setPermSearch("");}}><span className="font-medium">{selectedPerm.name}</span><span className="text-xs text-muted-foreground">change</span></div>
                :<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={permSearch} onChange={e=>{setPermSearch(e.target.value);setPermDropOpen(true);}} onFocus={()=>setPermDropOpen(true)} placeholder="Search permanent candidates…" className="h-10 pl-9"/></div>}
              {permDropOpen&&(
                <div className="absolute left-0 right-0 top-11 z-50 bg-card border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredPerm.length===0?<div className="px-4 py-3 text-sm text-muted-foreground">No permanent candidates found</div>
                    :filteredPerm.map(c=>(<button key={c.id} onMouseDown={()=>{setSelectedPerm({id:c.id,name:`${c.first_name??""} ${c.last_name??""}`.trim()});setPermDropOpen(false);setPermSearch("");}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60">{c.first_name} {c.last_name}</button>))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="h-10 px-5 rounded-full border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={saveConvert} disabled={saving||!selectedPerm} className="h-10 px-5 rounded-full bg-navy text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{saving?"Converting…":"Add to temp compliance"}</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
