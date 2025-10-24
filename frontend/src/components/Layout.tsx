// src/components/Layout.tsx
import React from 'react'
import Head from 'next/head'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

const Layout: React.FC<LayoutProps> = ({ children, title = 'TaxPilot Assistant Pro' }) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Sistema AI per gestione documenti fiscali" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <main>{children}</main>
      </div>
    </>
  )
}

export default Layout

// Esempio di utilizzo nelle pagine:
// src/pages/dashboard.tsx
import Layout from '../components/Layout'

const Dashboard: React.FC = () => {
  return (
    <Layout title="Dashboard - TaxPilot Assistant">
      {/* contenuto dashboard */}
    </Layout>
  )
}

export default Dashboard