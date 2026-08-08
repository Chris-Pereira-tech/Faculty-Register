import type { AssociationNature } from '../types';

export default function StatusStamp({ nature }: { nature: AssociationNature }) {
  const cls =
    nature === 'Regular' ? 'stamp--regular' : nature === 'Contract' ? 'stamp--contract' : 'stamp--adhoc';
  return <span className={`stamp ${cls}`}>{nature}</span>;
}
