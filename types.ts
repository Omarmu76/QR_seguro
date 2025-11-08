
export enum Screen {
  Home = 'HOME',
  Scan = 'SCAN',
  Generate = 'GENERATE',
  MyItems = 'MY_ITEMS',
  Sell = 'SELL',
  ScanResult = 'SCAN_RESULT',
  GeneratedQR = 'GENERATED_QR',
}

export enum ItemStatus {
  EnRegla = 'EN_REGLA',
  Denunciado = 'DENUNCIADO',
  Vendido = 'VENDIDO',
  Recuperado = 'RECUPERADO',
}

export interface Item {
  tipo: string;
  marca: string;
  modelo: string;
  identificador: string; // Patente or Serial
  // Optional properties that are present on items retrieved from Firestore
  qrId?: string;
  ownerId?: string;
  status?: ItemStatus;
  location?: string; // Added for display purposes
}
