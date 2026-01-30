'use client'

import { useState, useRef } from 'react'
import { EmailTemplate, updateEmailTemplate } from '@/actions/email-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Save } from 'lucide-react'
import { TestEmailDialog } from './TestEmailDialog'

export function EmailTemplateManager({ templates }: { templates: EmailTemplate[] }) {
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(templates[0] || null)
    const [subject, setSubject] = useState(templates[0]?.subject || '')
    const [body, setBody] = useState(templates[0]?.body || '')
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSelect = (tmpl: EmailTemplate) => {
        setSelectedTemplate(tmpl)
        setSubject(tmpl.subject)
        setBody(tmpl.body)
    }

    const handleSave = async () => {
        if (!selectedTemplate) return
        setIsSaving(true)
        try {
            await updateEmailTemplate(selectedTemplate.id, subject, body)
            toast({ title: '保存しました', description: 'メールテンプレートを更新しました。' })
        } catch (e) {
            toast({ title: 'エラー', description: '保存に失敗しました。', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const insertVariable = (variable: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value

        const textToInsert = `{{${variable}}}`
        const newText = text.substring(0, start) + textToInsert + text.substring(end)

        setBody(newText)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
        }, 0)
    }

    if (!templates.length) return <div>テンプレートが見つかりません。</div>

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar List */}
            <div className="w-full md:w-1/3 space-y-2 overflow-y-auto pr-2 border-r border-gray-100">
                {templates.map(tmpl => (
                    <button
                        key={tmpl.id}
                        onClick={() => handleSelect(tmpl)}
                        className={`w-full text-left p-4 rounded-lg transition-all border ${selectedTemplate?.id === tmpl.id
                            ? 'bg-cyan-50 border-cyan-200 shadow-sm'
                            : 'bg-white border-transparent hover:bg-gray-50'
                            }`}
                    >
                        <div className="font-semibold text-gray-800 break-all">{tmpl.subject}</div>
                        <div className="text-xs text-gray-400 mt-1 font-mono">{tmpl.key}</div>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2 text-ellipsis overflow-hidden h-8">
                            {tmpl.description}
                        </div>
                    </button>
                ))}
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {selectedTemplate ? (
                    <Card className="flex flex-col h-full shadow-sm border-gray-200">
                        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-gray-500" />
                                        テンプレート編集
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        ID: <code className="bg-gray-200 px-1 rounded">{selectedTemplate.key}</code>
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <TestEmailDialog
                                        templateKey={selectedTemplate.key}
                                        subject={subject}
                                        body={body}
                                    />
                                    <Button onClick={handleSave} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        保存
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
                            <div className="space-y-2">
                                <Label>件名</Label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="font-medium"
                                />
                            </div>

                            <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                                <div className="flex flex-col gap-2 mb-2">
                                    <Label>本文</Label>
                                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                        <div className="text-xs text-slate-500 mb-2 font-medium">利用可能な変数 (クリックして挿入):</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplate.variables?.map(v => (
                                                <Badge
                                                    key={v}
                                                    variant="outline"
                                                    onClick={() => insertVariable(v)}
                                                    className="cursor-pointer hover:bg-cyan-100 hover:text-cyan-800 hover:border-cyan-300 transition-colors bg-white font-mono"
                                                >
                                                    {`{{${v}}}`}
                                                </Badge>
                                            ))}
                                            {(!selectedTemplate.variables || selectedTemplate.variables.length === 0) && (
                                                <span className="text-xs text-slate-400">定義された変数がありません</span>
                                            )}
                                        </div>
                                        {selectedTemplate.key === 'inquiry_received' && (
                                            <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-200 pt-2">
                                                ※ GASから送信された任意のキーも <code>{`{{キー名}}`}</code> で使用可能です。
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Textarea
                                    ref={textareaRef}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="flex-1 font-mono text-sm leading-relaxed resize-none p-4"
                                />
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-md text-sm text-yellow-800">
                                <p className="font-bold mb-1">💡 ヒント</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><code>{`{{変数名}}`}</code> の部分は自動的に置き換わります。変更しないでください。</li>
                                    <li>改行はそのまま反映されます。</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        左側のリストからテンプレートを選択してください
                    </div>
                )}
            </div>
        </div>
    )
}
