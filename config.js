// Firebase Init
const firebaseConfig = {
  apiKey: "AIzaSyD8ViNohFXIu6oPU3m5H_lxlcvGERX2tZo",
  authDomain: "management-tp.firebaseapp.com",
  databaseURL: "https://management-tp-default-rtdb.firebaseio.com",
  projectId: "management-tp",
  storageBucket: "management-tp.firebasestorage.app",
  messagingSenderId: "925263845723",
  appId: "1:925263845723:web:482be2e470b9a381bfa27e"
};

firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDB = firebase.database();

const ADMIN_UID = "lywCmAAMFtMqKsebBb9ouXtwjpH2";
const FB_PATH = "management/data";
const USERS_PATH = "management/users";
const LS_KEY = "managementData";
const LS_BACKUP_KEY = "managementDataBackup";
const LS_LAST_SYNC = "managementLastSync";
const CLIENT_ID_KEY = "managementClientId";

let currentUser = null;
let userRole = "guest";
let isAdmin = false;
let canView = false;
let currentUserData = null;

let data = null;
let store = "";
let tab = "sales";
let edit = null;
let period = null;
let isOnline = false;
let isSyncing = false;
let clientId = "";
let authMode = "login";
let fbDataListener = null;
let fbConnListener = null;
let authListenerSet = false;
let fbPresenceListener = null;
let currentUserStatusRef = null;

const stores = [
  ["cleopatra", "كليوباترا", 0],
  ["aladdin", "علاء الدين", 0],
  ["lobby", "اللوبي", 1],
  ["bardi", "البردي", 1],
  ["sindbad", "البيسين", 1],
  ["portofino", "بورتوفينو", 1]
];

const tabNames = {
  sales: "المبيعات اليومية",
  exchange: "تغيير العملة",
  traders: "التجار",
  sellers: "البائعين",
  expenses: "المصروفات والمسحوبات",
  profits: "توزيع الأرباح"
};

const blank = () => ({
  sales: [], exchange: [], traderTx: [], sellers: [], fixedSellers: [],
  items: [], expenses: [], withdrawals: [], partners: [],
  salaryMode: "percent", commissionPercent: 0, salaryFixedTotal: 0
});