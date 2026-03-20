import hints from '../../data/hints.json';

const PageHint = ({ page }) => {
  const text = hints[page];
  if (!text) return null;
  return (
    <div className="page-hint">
      {text}
    </div>
  );
};
export default PageHint;
