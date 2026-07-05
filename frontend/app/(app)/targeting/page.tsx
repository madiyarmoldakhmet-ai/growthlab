'use client'

import { useState, useEffect } from 'react'

interface Target {
  id: number
  value: string
  type: 'INSTAGRAM' | 'EMAIL'
}

export default function TargetingPage() {
  const [databaseName, setDatabaseName] = useState('Школы Талдыкоргана')
  const [inputText, setInputText] = useState('')
  const [targets, setTargets] = useState<Target[]>([])
  const [isProcessed, setIsProcessed] = useState(false)

  // Счетчик целей на лету
  const targetCount = inputText
    .split('\n')
    .filter(line => line.trim() !== '').length

  const handleProcess = () => {
    // Разделяем текст по переносам строк
    const lines = inputText.split('\n')

    // Очищаем от пробелов и удаляем пустые строки
    const cleanedLines = lines
      .map(line => line.trim())
      .filter(line => line !== '')

    // Определяем тип каждой цели
    const processedTargets: Target[] = cleanedLines.map((line, index) => {
      let type: 'INSTAGRAM' | 'EMAIL' = 'EMAIL'

      if (line.includes('@')) {
        type = 'INSTAGRAM'
      } else if (line.includes('.')) {
        type = 'EMAIL'
      }

      return {
        id: index + 1,
        value: line,
        type
      }
    })

    setTargets(processedTargets)
    setIsProcessed(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Загрузка базы целей
          </h1>

          {/* Поле ввода названия базы */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название базы
            </label>
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Textarea для списка целей */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Список целей
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Вставьте список @username или Email адресов. Каждая цель с новой строки.
Пример:
@school_taldy_1
@gymnasium_2
info@restoran.kz"
              className="w-full h-[400px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Счетчик целей */}
          <div className="mb-4 text-sm text-gray-600">
            Найдено целей: {targetCount}
          </div>

          {/* Кнопка подготовки */}
          <button
            onClick={handleProcess}
            disabled={!inputText.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            ⚙️ Подготовить к отправке
          </button>

          {/* Результаты обработки */}
          {isProcessed && targets.length > 0 && (
            <div className="mt-8">
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">
                  ✅ База готова к рассылке. Ожидайте подключения аккаунтов...
                </p>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Обработанная база целей ({targets.length} шт.)
              </h2>

              <div className="space-y-2">
                {targets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
                  >
                    <span className="text-gray-900">
                      Цель {target.id}: {target.value}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      target.type === 'INSTAGRAM'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {target.type === 'INSTAGRAM' ? 'Инстаграм' : 'Email'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}