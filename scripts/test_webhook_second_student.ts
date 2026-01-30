


async function testWebhook() {
    const url = 'http://localhost:3000/api/webhooks/onboarding';

    // Simulate GAS payload structure
    const payload = {
        "name": "テスト 太郎",
        "kana": "テスト タロウ",
        "email": `test_second_student_${Date.now()}@example.com`,
        "phone": "090-1234-5678",
        "message": "【目標】\nクロール25m\n\n【その他】\n特になし",
        "second_name": "テスト 次郎",
        "second_name_kana": "テスト ジロウ",
        "第一希望": "2026/02/01 10:00",
        "第二希望": "2026/02/02 14:00",
        "第三希望": "2026/02/03 16:00"
    };

    console.log('Sending payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', data);

        if (response.status === 200 && data.success) {
            console.log('✅ Webhook test passed. Student ID:', data.studentId);
        } else {
            console.error('❌ Webhook test failed.');
        }

    } catch (error) {
        console.error('Error during test:', error);
    }
}

testWebhook();
