// `nature` is typed as the current two-option union, but data saved before
// Contract/Ad hoc were merged may still hold the literal 'Contract' or 'Ad
// hoc' string — comparing against 'Regular' rather than the exact new
// value keeps old records displaying correctly instead of falling through.
export default function StatusStamp({ nature }: { nature: string }) {
  const isRegular = nature === 'Regular';
  return (
    <span className={`stamp ${isRegular ? 'stamp--regular' : 'stamp--contract'}`}>
      {isRegular ? 'Regular' : 'Contract / Ad hoc'}
    </span>
  );
}
