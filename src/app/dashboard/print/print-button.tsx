'use client';

export function PrintButton() {
  return (
    <button className="btn btn-solid" type="button" onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
