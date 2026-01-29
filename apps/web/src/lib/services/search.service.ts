import { adminDb } from '@/lib/firebase/admin';

export type SearchResultType = 'llc' | 'property' | 'tenant' | 'lease' | 'case';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  llcId?: string;
  llcName?: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Get all LLCs accessible to a user
 */
async function getUserLlcs(userId: string): Promise<{ id: string; legalName: string }[]> {
  const membershipsSnapshot = await adminDb
    .collectionGroup('members')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  const llcs: { id: string; legalName: string }[] = [];

  for (const memberDoc of membershipsSnapshot.docs) {
    const llcRef = memberDoc.ref.parent.parent;
    if (llcRef) {
      const llcDoc = await llcRef.get();
      if (llcDoc.exists && llcDoc.data()?.status === 'active') {
        llcs.push({
          id: llcDoc.id,
          legalName: llcDoc.data()?.legalName || 'Unknown',
        });
      }
    }
  }

  return llcs;
}

/**
 * Check if string matches query (case-insensitive)
 */
function matches(str: string | undefined | null, query: string): boolean {
  if (!str) return false;
  return str.toLowerCase().includes(query.toLowerCase());
}

/**
 * Search across all entities in a single LLC
 */
async function searchLlc(
  llcId: string,
  llcName: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Check if LLC name matches
  if (matches(llcName, query)) {
    results.push({
      type: 'llc',
      id: llcId,
      title: llcName,
      subtitle: 'LLC',
      href: `/llcs/${llcId}`,
    });
  }

  const llcRef = adminDb.collection('llcs').doc(llcId);

  // Search properties
  const propertiesSnap = await llcRef.collection('properties').limit(50).get();
  for (const doc of propertiesSnap.docs) {
    const data = doc.data();
    const name = data.name || '';
    const address = data.address;
    const addressStr = address
      ? `${address.street1 || ''} ${address.city || ''} ${address.state || ''}`
      : '';

    if (matches(name, query) || matches(addressStr, query)) {
      results.push({
        type: 'property',
        id: doc.id,
        llcId,
        llcName,
        title: name || addressStr.trim() || 'Property',
        subtitle: `Property • ${llcName}`,
        href: `/llcs/${llcId}/properties/${doc.id}`,
      });
    }

    if (results.length >= limit) break;
  }

  // Search tenants (check global tenants collection)
  if (results.length < limit) {
    const tenantsSnap = await adminDb.collection('tenants').limit(100).get();
    for (const doc of tenantsSnap.docs) {
      const data = doc.data();
      let name = '';
      let subtitle = 'Tenant';

      if (data.type === 'residential') {
        name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      } else if (data.type === 'commercial') {
        name = data.businessName || '';
        subtitle = 'Commercial Tenant';
      }

      if (matches(name, query) || matches(data.email, query)) {
        results.push({
          type: 'tenant',
          id: doc.id,
          title: name || 'Unnamed Tenant',
          subtitle,
          href: `/tenants/${doc.id}`,
        });
      }

      if (results.length >= limit) break;
    }
  }

  // Search leases
  if (results.length < limit) {
    const leasesSnap = await llcRef.collection('leases').limit(50).get();
    for (const doc of leasesSnap.docs) {
      const data = doc.data();
      const status = data.status || 'draft';

      // We'll search by property/unit info if available
      if (results.length < limit) {
        results.push({
          type: 'lease',
          id: doc.id,
          llcId,
          llcName,
          title: `Lease (${status})`,
          subtitle: `${data.startDate || ''} - ${data.endDate || ''} • ${llcName}`,
          href: `/llcs/${llcId}/leases/${doc.id}`,
        });
      }
    }
  }

  // Search cases
  if (results.length < limit) {
    const casesSnap = await llcRef.collection('cases').limit(50).get();
    for (const doc of casesSnap.docs) {
      const data = doc.data();
      const caseType = data.caseType || 'case';
      const docketNumber = data.docketNumber || '';
      const plaintiff = data.plaintiff?.name || '';
      const opposingParty = data.opposingParty?.name || '';

      if (
        matches(docketNumber, query) ||
        matches(plaintiff, query) ||
        matches(opposingParty, query) ||
        matches(caseType, query)
      ) {
        results.push({
          type: 'case',
          id: doc.id,
          llcId,
          llcName,
          title: docketNumber || `${caseType} Case`,
          subtitle: `Legal Case • ${llcName}`,
          href: `/llcs/${llcId}/legal/${doc.id}`,
        });
      }

      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Global search across all user's LLCs
 */
export async function globalSearch(
  userId: string,
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const userLlcs = await getUserLlcs(userId);

  if (userLlcs.length === 0) {
    return [];
  }

  // Search all LLCs in parallel
  const searchPromises = userLlcs.map(llc =>
    searchLlc(llc.id, llc.legalName, query, limit)
  );
  const searchResults = await Promise.all(searchPromises);

  // Flatten and deduplicate
  const allResults = searchResults.flat();

  // Sort by relevance (exact matches first, then by type)
  const q = query.toLowerCase();
  allResults.sort((a, b) => {
    const aExact = a.title.toLowerCase() === q ? 0 : 1;
    const bExact = b.title.toLowerCase() === q ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aStarts = a.title.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    // Type priority: llc > property > tenant > lease > case
    const typePriority: Record<string, number> = {
      llc: 0,
      property: 1,
      tenant: 2,
      lease: 3,
      case: 4,
    };
    return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
  });

  return allResults.slice(0, limit);
}
