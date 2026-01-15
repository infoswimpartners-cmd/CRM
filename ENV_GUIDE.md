# メール送信設定ガイド

このファイルの内容をコピーして、プロジェクトルートに `.env.local` という名前のファイルを作成してください。
作成後、`SMTP_USER` の部分をご自身のGmailアドレスに書き換えてください。

```env
# Email Settings (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=hokt gemu kkgz ffgk
```

※ `.env.local` はGitにはコミットされませんが、パスワードが含まれるため取り扱いにはご注意ください。
