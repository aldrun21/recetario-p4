// Cloudflare Workers KV API Client
// Connects to /api/kv/* which runs via Cloudflare Pages Functions in production
// and via the local server in development/preview.

export interface KvHealthStatus {
  status: string;
  kvConfigured: boolean;
  provider: string;
  environment?: string;
  timestamp: string;
}

export async function checkKvHealth(): Promise<KvHealthStatus> {
  try {
    const res = await fetch('/api/kv/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e: any) {
    return {
      status: 'error',
      kvConfigured: false,
      provider: 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}

// Patients
export async function getKvPatients(userId: string) {
  const res = await fetch(`/api/kv/collections/patients?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Error al obtener pacientes desde Cloudflare KV');
  return (await res.json()) as any[];
}

export async function addKvPatient(patientData: any) {
  const res = await fetch('/api/kv/collections/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData)
  });
  if (!res.ok) throw new Error('Error al registrar paciente en Cloudflare KV');
  return await res.json();
}

// Prescriptions
export async function getKvPrescriptions(userId: string) {
  const res = await fetch(`/api/kv/collections/prescriptions?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Error al obtener recetas desde Cloudflare KV');
  return (await res.json()) as any[];
}

export async function addKvPrescription(prescriptionData: any) {
  const res = await fetch('/api/kv/collections/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prescriptionData)
  });
  if (!res.ok) throw new Error('Error al emitir receta en Cloudflare KV');
  return await res.json();
}

export async function deleteKvPrescription(id: string, userId: string) {
  const res = await fetch(`/api/kv/collections/prescriptions/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar receta en Cloudflare KV');
  return await res.json();
}

// Catalog Medications
export async function getKvCatalog(userId: string) {
  const res = await fetch(`/api/kv/collections/medications_catalog?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Error al obtener catálogo desde Cloudflare KV');
  return (await res.json()) as any[];
}

export async function addKvCatalogMed(medData: any) {
  const res = await fetch('/api/kv/collections/medications_catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medData)
  });
  if (!res.ok) throw new Error('Error al guardar en catálogo en Cloudflare KV');
  return await res.json();
}

export async function updateKvCatalogMed(id: string, medData: any, userId: string) {
  const res = await fetch(`/api/kv/collections/medications_catalog/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(medData)
  });
  if (!res.ok) throw new Error('Error al actualizar catálogo en Cloudflare KV');
  return await res.json();
}

export async function deleteKvCatalogMed(id: string, userId: string) {
  const res = await fetch(`/api/kv/collections/medications_catalog/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Error al eliminar de catálogo en Cloudflare KV');
  return await res.json();
}

// Doctor Profile
export async function getKvDoctorProfile(userId: string) {
  const res = await fetch(`/api/kv/doc/doctor_${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function saveKvDoctorProfile(userId: string, profileData: any) {
  const res = await fetch(`/api/kv/doc/doctor_${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  if (!res.ok) throw new Error('Error al guardar perfil en Cloudflare KV');
  return await res.json();
}
