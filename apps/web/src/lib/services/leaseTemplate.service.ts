import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { LeaseDocumentType } from '@shared/types';

// Re-export for server-side usage
export { TEMPLATE_PLACEHOLDERS } from '@/lib/constants/templatePlaceholders';

export interface CreateTemplateInput {
  name: string;
  type: LeaseDocumentType;
  description?: string;
  templateContent: string;
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  templateContent?: string;
  isDefault?: boolean;
}

export interface LeaseTemplateWithId {
  id: string;
  llcId: string;
  name: string;
  type: LeaseDocumentType;
  description?: string;
  templateContent: string;
  isDefault: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create a new template.
 */
export async function createTemplate(
  llcId: string,
  input: CreateTemplateInput,
  actorUserId: string
): Promise<LeaseTemplateWithId> {
  const templateRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .doc();

  // If this is set as default, unset other defaults of the same type
  if (input.isDefault) {
    await unsetDefaultTemplates(llcId, input.type);
  }

  const templateData = {
    llcId,
    name: input.name,
    type: input.type,
    description: input.description || null,
    templateContent: input.templateContent,
    isDefault: input.isDefault || false,
    createdByUserId: actorUserId,
    createdAt: FieldValue.serverTimestamp(),
  };

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.set(templateRef, templateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'create',
    entityType: 'lease_template',
    entityId: templateRef.id,
    entityPath: `llcs/${llcId}/templates/${templateRef.id}`,
    changes: {
      after: {
        name: input.name,
        type: input.type,
        isDefault: input.isDefault,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: templateRef.id,
    llcId,
    name: input.name,
    type: input.type,
    description: input.description,
    templateContent: input.templateContent,
    isDefault: input.isDefault || false,
    createdByUserId: actorUserId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get a single template.
 */
export async function getTemplate(
  llcId: string,
  templateId: string
): Promise<LeaseTemplateWithId | null> {
  const templateDoc = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .doc(templateId)
    .get();

  if (!templateDoc.exists) {
    return null;
  }

  const data = templateDoc.data();
  if (!data) {
    return null;
  }

  return {
    id: templateDoc.id,
    llcId: data.llcId,
    name: data.name,
    type: data.type as LeaseDocumentType,
    description: data.description || undefined,
    templateContent: data.templateContent,
    isDefault: data.isDefault || false,
    createdByUserId: data.createdByUserId,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * List all templates for an LLC.
 */
export async function listTemplates(
  llcId: string,
  type?: LeaseDocumentType
): Promise<LeaseTemplateWithId[]> {
  let query = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .orderBy('name', 'asc') as FirebaseFirestore.Query;

  if (type) {
    query = query.where('type', '==', type);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      llcId: data.llcId,
      name: data.name,
      type: data.type as LeaseDocumentType,
      description: data.description || undefined,
      templateContent: data.templateContent,
      isDefault: data.isDefault || false,
      createdByUserId: data.createdByUserId,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
    };
  });
}

/**
 * Update a template.
 */
export async function updateTemplate(
  llcId: string,
  templateId: string,
  input: UpdateTemplateInput,
  actorUserId: string
): Promise<LeaseTemplateWithId> {
  const templateRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .doc(templateId);

  const templateDoc = await templateRef.get();

  if (!templateDoc.exists) {
    throw new Error('NOT_FOUND: Template not found');
  }

  const currentData = templateDoc.data();
  if (!currentData) {
    throw new Error('NOT_FOUND: Template data not found');
  }

  // If setting as default, unset other defaults
  if (input.isDefault && !currentData.isDefault) {
    await unsetDefaultTemplates(llcId, currentData.type);
  }

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.templateContent !== undefined) updateData.templateContent = input.templateContent;
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.update(templateRef, updateData);
  batch.set(auditRef, {
    actorUserId,
    action: 'update',
    entityType: 'lease_template',
    entityId: templateId,
    entityPath: `llcs/${llcId}/templates/${templateId}`,
    changes: {
      before: { name: currentData.name, isDefault: currentData.isDefault },
      after: updateData,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    id: templateId,
    llcId,
    name: input.name ?? currentData.name,
    type: currentData.type as LeaseDocumentType,
    description: input.description ?? currentData.description,
    templateContent: input.templateContent ?? currentData.templateContent,
    isDefault: input.isDefault ?? currentData.isDefault,
    createdByUserId: currentData.createdByUserId,
    createdAt: currentData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete a template.
 */
export async function deleteTemplate(
  llcId: string,
  templateId: string,
  actorUserId: string
): Promise<void> {
  const templateRef = adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .doc(templateId);

  const templateDoc = await templateRef.get();

  if (!templateDoc.exists) {
    throw new Error('NOT_FOUND: Template not found');
  }

  const data = templateDoc.data();

  const auditRef = adminDb.collection('llcs').doc(llcId).collection('auditLogs').doc();

  const batch = adminDb.batch();
  batch.delete(templateRef);
  batch.set(auditRef, {
    actorUserId,
    action: 'delete',
    entityType: 'lease_template',
    entityId: templateId,
    entityPath: `llcs/${llcId}/templates/${templateId}`,
    changes: {
      before: {
        name: data?.name,
        type: data?.type,
      },
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Get the default template for a document type.
 */
export async function getDefaultTemplate(
  llcId: string,
  type: LeaseDocumentType
): Promise<LeaseTemplateWithId | null> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .where('type', '==', type)
    .where('isDefault', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  if(!doc) {
    return null
  }
  const data = doc.data();

  return {
    id: doc.id,
    llcId: data.llcId,
    name: data.name,
    type: data.type as LeaseDocumentType,
    description: data.description || undefined,
    templateContent: data.templateContent,
    isDefault: true,
    createdByUserId: data.createdByUserId,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || undefined,
  };
}

/**
 * Helper to unset default flag on all templates of a type.
 */
async function unsetDefaultTemplates(llcId: string, type: LeaseDocumentType): Promise<void> {
  const snapshot = await adminDb
    .collection('llcs')
    .doc(llcId)
    .collection('templates')
    .where('type', '==', type)
    .where('isDefault', '==', true)
    .get();

  if (snapshot.empty) return;

  const batch = adminDb.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { isDefault: false });
  }
  await batch.commit();
}

/**
 * Render a template with data, replacing placeholders.
 */
export function renderTemplate(
  templateContent: string,
  data: {
    lease?: {
      startDate?: string;
      endDate?: string;
      rentAmount?: number;
      depositAmount?: number;
      dueDay?: number;
    };
    property?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    unit?: {
      number?: string;
      bedrooms?: number;
      bathrooms?: number;
    };
    tenant?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    llc?: {
      name?: string;
    };
  }
): string {
  let rendered = templateContent;

  // Format money values
  const formatMoney = (cents?: number) =>
    cents !== undefined ? '$' + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '';

  // Format date
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  // Replace placeholders
  rendered = rendered.replace(/\{\{lease\.startDate\}\}/g, formatDate(data.lease?.startDate));
  rendered = rendered.replace(/\{\{lease\.endDate\}\}/g, formatDate(data.lease?.endDate));
  rendered = rendered.replace(/\{\{lease\.rentAmount\}\}/g, formatMoney(data.lease?.rentAmount));
  rendered = rendered.replace(/\{\{lease\.depositAmount\}\}/g, formatMoney(data.lease?.depositAmount));
  rendered = rendered.replace(/\{\{lease\.dueDay\}\}/g, data.lease?.dueDay?.toString() || '');

  rendered = rendered.replace(/\{\{property\.name\}\}/g, data.property?.name || '');
  rendered = rendered.replace(/\{\{property\.address\}\}/g, data.property?.address || '');
  rendered = rendered.replace(/\{\{property\.city\}\}/g, data.property?.city || '');
  rendered = rendered.replace(/\{\{property\.state\}\}/g, data.property?.state || '');
  rendered = rendered.replace(/\{\{property\.zipCode\}\}/g, data.property?.zipCode || '');

  rendered = rendered.replace(/\{\{unit\.number\}\}/g, data.unit?.number || '');
  rendered = rendered.replace(/\{\{unit\.bedrooms\}\}/g, data.unit?.bedrooms?.toString() || '');
  rendered = rendered.replace(/\{\{unit\.bathrooms\}\}/g, data.unit?.bathrooms?.toString() || '');

  rendered = rendered.replace(/\{\{tenant\.name\}\}/g, data.tenant?.name || '');
  rendered = rendered.replace(/\{\{tenant\.email\}\}/g, data.tenant?.email || '');
  rendered = rendered.replace(/\{\{tenant\.phone\}\}/g, data.tenant?.phone || '');

  rendered = rendered.replace(/\{\{llc\.name\}\}/g, data.llc?.name || '');
  rendered = rendered.replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));

  return rendered;
}
