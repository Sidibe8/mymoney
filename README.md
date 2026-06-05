# 📦 MyMoney Backend

> Un backend complet pour une application de mobile money (type Orange Money/Wave)

## 🎯 Caractéristiques

- ✅ Authentification par **SMS (OTP)** sans mot de passe
- ✅ Gestion de **portefeuilles (wallets)** avec soldes
- ✅ **Transferts d'argent** entre utilisateurs
- ✅ **Paiements de services** (ISAGO, CANAL+, EDM, EAU, etc.)
- ✅ **Historique des transactions**
- ✅ **Bénéficiaires fréquents**
- ✅ **QR code** pour les paiements
- ✅ **Limites quotidiennes** et vérification de solde

## 🏗️ Stack technique

| Élément | Technologie |
|---------|-------------|
| Runtime | Node.js |
| Framework | Express.js |
| Base de données | MongoDB avec Mongoose |
| Authentification | JWT (JSON Web Tokens) |
| Hash | bcryptjs |
| Validation | express-validator |

## 📁 Structure du projet

```
mymoney-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Wallet.js
│   │   ├── Transaction.js
│   │   └── OTP.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── walletController.js
│   │   ├── transactionController.js
│   │   └── userController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Installation et démarrage

### Prérequis
- Node.js (v14 ou supérieur)
- MongoDB (installé localement ou accès à une instance cloud)
- npm ou yarn

### Étapes d'installation

1. **Cloner ou télécharger le projet**
```bash
cd backend-my-money
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
Créer un fichier `.env` à la racine du projet (déjà inclus) et modifier les valeurs si nécessaire:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mymoney
JWT_SECRET=super_secret_key_change_this_in_production_2024
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=5
SMS_SIMULATION=true
```

4. **Démarrer MongoDB**
```bash
mongod
```

5. **Démarrer le serveur**

Mode développement (avec hot-reload):
```bash
npm run dev
```

Mode production:
```bash
npm start
```

Le serveur démarrera sur `http://localhost:3000`

## 📡 API Endpoints

### Authentification

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/auth/request-otp` | Demander un code OTP | ❌ |
| POST | `/api/auth/verify-otp` | Vérifier OTP et connexion | ❌ |
| POST | `/api/auth/logout` | Déconnexion | ✅ |

### Portefeuille

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/wallet/balance` | Voir solde | ✅ |
| POST | `/api/wallet/deposit` | Recharger compte | ✅ |
| GET | `/api/wallet/qr-code` | Générer QR code | ✅ |
| POST | `/api/wallet/scan-pay` | Payer par QR code | ✅ |

### Transactions

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/api/transactions/transfer` | Transfert d'argent | ✅ |
| POST | `/api/transactions/pay-service` | Payer un service | ✅ |
| GET | `/api/transactions/history` | Historique | ✅ |
| GET | `/api/transactions/stats` | Statistiques | ✅ |
| GET | `/api/transactions/transaction/:id` | Détails d'une transaction | ✅ |

### Utilisateur

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/api/user/profile` | Profil utilisateur | ✅ |
| PUT | `/api/user/profile` | Modifier profil | ✅ |
| GET | `/api/user/beneficiaries` | Bénéficiaires fréquents | ✅ |
| GET | `/api/user/search?phone=XXXX` | Rechercher utilisateur | ✅ |
| POST | `/api/user/register-device` | Enregistrer appareil | ✅ |

## 🧪 Exemples de requêtes

### 1. Demander un code OTP

```bash
curl -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "70123456"}'
```

Response:
```json
{
  "message": "Code envoyé avec succès",
  "expiresIn": 5,
  "demoCode": "123456"
}
```

### 2. Vérifier l'OTP et se connecter

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "70123456",
    "code": "123456",
    "firstName": "Aminata",
    "lastName": "Diallo"
  }'
```

Response:
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "firstName": "Aminata",
    "lastName": "Diallo",
    "phone": "70123456",
    "fullName": "Aminata Diallo"
  },
  "wallet": {
    "balance": 500000,
    "currency": "XOF"
  }
}
```

### 3. Récupérer le solde

```bash
curl -X GET http://localhost:3000/api/wallet/balance \
  -H "Authorization: Bearer TOKEN"
```

### 4. Transférer de l'argent

```bash
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "receiverPhone": "77123456",
    "amount": 25000,
    "description": "Remboursement"
  }'
```

### 5. Payer un service (ISAGO)

```bash
curl -X POST http://localhost:3000/api/transactions/pay-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "service": "ISAGO",
    "amount": 250000,
    "customerName": "Fatou Diallo",
    "customerId": "ISAGO12345"
  }'
```

### 6. Récupérer l'historique

```bash
curl -X GET "http://localhost:3000/api/transactions/history?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

## 🔧 Configuration avancée

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | 3000 |
| `MONGODB_URI` | URL de la base de données MongoDB | mongodb://localhost:27017/mymoney |
| `JWT_SECRET` | Secret pour signer les tokens JWT | super_secret_key_change_this_in_production_2024 |
| `JWT_EXPIRES_IN` | Durée d'expiration du token | 7d |
| `OTP_EXPIRY_MINUTES` | Durée d'expiration de l'OTP en minutes | 5 |
| `SMS_SIMULATION` | Simuler l'envoi de SMS | true |

## 📊 Services disponibles pour les paiements

| Service | Montant min | Montant max |
|---------|------------|------------|
| ISAGO | 250 000 | Non limité |
| CANAL+ | 10 000 | Non limité |
| EDM | 1 000 | Non limité |
| EAU | 1 000 | Non limité |
| INTERNET | 5 000 | Non limité |
| PHARMACY | 500 | Non limité |

## 🔐 Authentification

Le système utilise **JWT (JSON Web Tokens)** pour l'authentification. Après la vérification de l'OTP, vous recevez un token à inclure dans l'en-tête `Authorization` de toutes les requêtes protégées:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🐛 Dépannage

### MongoDB ne se connecte pas
- Assurez-vous que MongoDB est en cours d'exécution
- Vérifiez l'URI MongoDB dans le fichier `.env`
- Par défaut: `mongodb://localhost:27017/mymoney`

### Port déjà utilisé
- Changez le port dans le fichier `.env`
- Ou trouvez le processus utilisant le port et terminez-le

### Erreurs d'authentification
- Vérifiez que le token JWT est correct et n'a pas expiré
- Assurez-vous qu'il est inclus dans l'en-tête `Authorization`

## 📝 Notes de développement

- Les codes OTP sont générés aléatoirement (6 chiffres)
- Les limites quotidiennes se réinitialisent à minuit
- Les transactions sont immuables (impossible de les modifier après création)
- Les numéros de téléphone doivent faire 8 chiffres
- L'email est optionnel lors de la création de compte

## 🚀 Prochaines étapes

- [ ] Ajouter des notifications push
- [ ] Implémenter les paiements réels (intégration SMS, paiement mobile)
- [ ] Ajouter un système de vérification KYC
- [ ] Implémenter les tests unitaires
- [ ] Ajouter la documentation API Swagger
- [ ] Déployer sur un serveur cloud

## 📄 Licence

MIT

## 👨‍💻 Support

Pour toute question ou problème, n'hésitez pas à consulter la documentation ou ouvrir une issue.

---

**Version**: 1.0.0  
**Dernière mise à jour**: Juin 2026
