import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authUtils } from '../utils/auth';

const withAuth = (WrappedComponent) => {
  return (props) => {
    // ✅ NESSUN CONTROLLO AUTH - ACCESSO LIBERO
    return <WrappedComponent {...props} />;
  };
};

export default withAuth;