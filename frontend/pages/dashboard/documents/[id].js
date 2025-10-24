import { useRouter } from 'next/router';
import VisualizzatoreFattura from '../../../components/VisualizzatoreFattura';

// Se hai un componente Layout per la tua dashboard, puoi importarlo qui
// import DashboardLayout from '../../../components/DashboardLayout';

function PaginaVisualizzaDocumento() {
  const router = useRouter();
  const { id } = router.query; // Estrae l'ID del documento dall'URL

  return (
    // <DashboardLayout> // Se usi un layout, decomenta questa riga
      <div className="container mx-auto p-4 md:p-8">
        {/* Potresti aggiungere qui un titolo o un link per tornare indietro */}
        {id ? (
          <VisualizzatoreFattura documentId={id} />
        ) : (
          <p className="text-center">Caricamento del documento...</p>
        )}
      </div>
    // </DashboardLayout> // ...e questa
  );
}

export default PaginaVisualizzaDocumento;