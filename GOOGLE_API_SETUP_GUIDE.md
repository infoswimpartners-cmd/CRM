# Google Cloud API（GA4 & Search Console）実連携 完全設定マニュアル

本マニュアルは、**Google Analytics 4（GA4）** および **Google Search Console** の実データを当システムと連携させるための全手順ガイドです。
費用は**完全無料（0円）**で設定可能です。作業時間は約10分〜15分程度となります。

---

## 全体の流れ

```
【Step 1】Google Cloud Console で API の有効化 & 鍵の発行
     │
     ▼
【Step 2】GA4 および Search Console に「閲覧者」として権限追加
     │
     ▼
【Step 3】システム（.env.local）にキー情報を設定して完了
```

---

## 【Step 1】Google Cloud Console での準備（約5分）

### 1-1. Google Cloud Console にアクセス
1. ブラウザで [Google Cloud Console](https://console.cloud.google.com/) を開きます。
2. Googleアカウント（GA4やSearch Consoleを管理しているアカウントを推奨）でログインします。
3. 画面上部のプロジェクト選択メニューから **「プロジェクトを作成」** をクリックし、任意のプロジェクト名（例: `swim-partners-analytics`）を入力して作成します。

### 1-2. 2つのAPIを有効化する
1. 画面上部の検索バーに **「Google Analytics Data API」** と入力して選択し、**「有効にする」** をクリックします。
2. 同様に、検索バーに **「Google Search Console API」** と入力して選択し、**「有効にする」** をクリックします。

### 1-3. サービスアカウント（接続ロボット）を作成
1. 左側のハンバーガーメニュー（≡）から **「IAM と管理」 > 「サービス アカウント」** を選択します。
2. 画面上部の **「＋ サービス アカウントを作成」** をクリックします。
3. **サービス アカウント名**: 任意の名前（例: `analytics-reader`）を入力。
4. **「作成して続行」** をクリックし、その後の「ロールの付与」「ユーザー アクセスの許可」は何も選択せずに **「完了」** をクリックします。

### 1-4. 認証キー（JSONファイル）のダウンロード
1. 作成されたサービスアカウント一覧から、今作ったアカウントをクリックします。
2. **「キー」** タブをクリックし、**「鍵を追加」 > 「新しい鍵を作成」** を選択します。
3. キーのタイプで **「JSON」** を選択し、**「作成」** をクリックします。
4. パソコンに `.json` ファイル（例: `swim-partners-analytics-xxxx.json`）がダウンロードされます。**（このファイルをStep 3で使用します）**
5. サービスアカウントの **メールアドレス**（例: `analytics-reader@xxxx.iam.gserviceaccount.com`）をコピーしておきます。

---

## 【Step 2】各ツールへの閲覧権限の付与（約3分）

先ほどコピーしたサービスアカウントのメールアドレスを、各ツールに「閲覧者」として登録します。

### 2-1. Google Analytics 4 (GA4) への登録
1. [Google アナリティクス](https://analytics.google.com/) にアクセスします。
2. 左下の歯車アイコン **「管理」** をクリックします。
3. プロパティ列の **「プロパティのアクセス管理」** をクリックします。
4. 右上の **「＋」ボタン > 「ユーザーを追加」** をクリックします。
5. **メールアドレス**: Step 1-4でコピーしたサービスアカウントのメールアドレスを貼り付けます。
6. **標準の役割**: **「閲覧者」** にチェックを入れ、右上の **「追加」** をクリックします。
7. 「プロパティ設定 > プロパティの詳細」を開き、**「プロパティ ID」**（9桁〜10桁の数字 例: `123456789`）をメモします。

### 2-2. Google Search Console への登録
1. [Google Search Console](https://search.google.com/search-console) にアクセスします。
2. 左メニュー最下部の **「設定」** をクリックします。
3. **「ユーザーと権限」** をクリックします。
4. 右上の **「ユーザーを追加」** をクリックします。
5. **メールアドレス**: サービスアカウントのメールアドレスを貼り付けます。
6. **権限**: **「閲覧（フルではなく標準の閲覧権限）」** を選択し、**「追加」** をクリックします。
7. Search Consoleで登録されている自社サイトの **プロパティURL**（例: `https://swim-partners.com/` または `sc-domain:swim-partners.com`）を確認します。

---

## 【Step 3】システムへの環境変数設定（約2分）

ダウンロードしたJSONキーとIDを、システムの `.env.local` ファイルに反映します。

### 3-1. `.env.local` に追記する内容

プロジェクトルートの `.env.local` に以下の3行を追加します：

```env
# 1. GA4 プロパティID (Step 2-1でメモした数字)
GA4_PROPERTY_ID="123456789"

# 2. Search Console サイトURL (Step 2-2で確認したURL)
SEARCH_CONSOLE_SITE_URL="https://swim-partners.com/"

# 3. サービスアカウントのJSON鍵の中身
# (Step 1-4でダウンロードした.jsonファイルをテキストエディタで開き、内容をそのまま1行にして貼り付けます)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}'
```

---

## 【Step 4】動作確認

1. 設定を保存後、開発サーバー（または本番環境）を再起動します。
2. ブラウザで [http://localhost:3000/admin/geo-seo](http://localhost:3000/admin/geo-seo) にアクセスします。
3. 「GA4 & Search Console データ連携」カードの表示を確認します：
   - 緑色の **「API CONNECTED (実データ連動中)」** バッジに変化します。
   - **「再同期する」** ボタンをクリックすると、直近30日間のセッション数、PerplexityやChatGPTからの**AI検索流入数**、Search Consoleの**クリック数・掲載順位**がリアルタイムに反映されます。
