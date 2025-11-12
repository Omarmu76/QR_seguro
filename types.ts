// Archivo: types.ts

export enum Screen {
  Home = 'HOME',
  Scan = 'SCAN',
  Generate = 'GENERATE',
  MyItems = 'MY_ITEMS',
  TRANSFERS = 'TRANSFERS',
  ScanResult = 'SCAN_RESULT',
  GeneratedQR = 'GENERATED_QR',
  InputCode = 'INPUT_CODE',
  EditItem = 'EDIT_ITEM',
  Map = 'MAP',
  ItemDetail = 'ITEM_DETAIL',
  REQUEST_TRANSFER = 'REQUEST_TRANSFER',
}

export enum ItemStatus {
  EnRegla = 'EN_REGLA',
  Denunciado = 'DENUNCIADO',
  Vendido = 'VENDIDO',
  Recuperado = 'RECUPERADO',
  DEVUELTO = 'DEVUELTO',
}

// <<< AÑADIMOS EL ENUM PARA EL ESTADO DE LA TRANSFERENCIA >>>
export enum TransferStatus {
  Pending = 'PENDIENTE',
  Approved = 'APROBADO',
  Rejected = 'RECHAZADO',
}

// <<< ACTUALIZAMOS LA INTERFAZ DE TRANSFERENCIA >>>
export interface TransferRequest {
  id?: string; // Firestore doc ID
  itemId: string;
  itemDetails: { // Guardamos una copia de los datos para mostrar
    tipo: string;
    marca: string;
    modelo: string;
    identificador: string;
  };
  sellerId: string;
  buyerId: string;
  buyerEmail: string | null; // El email del que pide la transferencia
  status: TransferStatus;
  createdAt: number; // Timestamp
}

export interface Item {
  tipo: string;
  marca: string;
  modelo: string;
  identificador: string; 
  qrId?: string;
  ownerId?: string;
  status?: ItemStatus;
  shortId?: string;
  location?: { lat: number, lng: number } | null; 
  locationTimestamp?: number | null; 
  recoveryLocation?: { lat: number, lng: number } | null; 
  recoveryTimestamp?: number | null; 
}
