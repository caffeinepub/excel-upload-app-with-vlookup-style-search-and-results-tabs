// Company information for PDF header and footer
// Single source of truth for all PDF export branding

export interface PDFCompanyInfo {
  headerContact: {
    phone: string;
    email: string;
  };
  footer: {
    tagline: string;
    website: string;
    email: string;
    location: string;
  };
}

export const PDF_COMPANY_INFO: PDFCompanyInfo = {
  headerContact: {
    phone: '+91-93133 03558',
    email: 'bd@pharmapolymorph.com',
  },
  footer: {
    tagline: 'First-of-its-kind Proprietary Platform for Polymorph Landscape, Analysis & Research',
    website: 'www.pharmapolymorph.com',
    email: 'bd@pharmapolymorph.com',
    location: 'D-107, Uddipak Consultancy Pvt Ltd, Pavitra Enclave, Mansarovar to Ring Road, Tragad, Ahmedabad, Gujarat, India. Pin - 382470',
  },
};
