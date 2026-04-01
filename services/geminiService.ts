
import { GoogleGenAI, Type } from "@google/genai";
import { JournalEntry, Account, Operation, Task, AuditFinding, FinancialTrendAnalysis, DecisionOption } from '../types';

interface ChartDataResponse {
    chartType: 'bar' | 'pie' | 'line' | 'horizontal-bar';
    chartData: { name: string; value: number }[] | { [key: string]: string | number }[];
    summary: string;
}

interface AIFinancialInsight {
    topDebtors: { name: string; amount: string; }[];
    creditBalanceAccounts: { name: string; amount: string; }[];
    recommendations: string[];
}

const getFinancialContext = (journalEntries: JournalEntry[], accounts: Account[]) => {
    const revenueAccounts = new Set(accounts.filter(a => a.type === 'Revenue').map(a => a.id));
    const expenseAccounts = new Set(accounts.filter(a => a.type === 'Expense').map(a => a.id));
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    const expenseBreakdown = new Map<string, number>();

    journalEntries.forEach(entry => {
        entry.lines.forEach(line => {
            if (revenueAccounts.has(line.accountId)) {
                totalRevenue += line.credit - line.debit;
            } else if (expenseAccounts.has(line.accountId)) {
                const amount = line.debit - line.credit;
                totalExpenses += amount;
                const accName = accounts.find(a => a.id === line.accountId)?.name || 'Unknown';
                expenseBreakdown.set(accName, (expenseBreakdown.get(accName) || 0) + amount);
            }
        });
    });

    return {
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: (totalRevenue - totalExpenses).toFixed(2),
        topExpenses: Array.from(expenseBreakdown.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
};

export async function generateChartData(prompt: string, journalEntries: any[], accounts: Account[]): Promise<ChartDataResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getFinancialContext(journalEntries, accounts);

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: {
            responseMimeType: "application/json",
            systemInstruction: "You are a financial data visualizer. Convert natural language requests into structured chart data for a shipping company."
        },
        contents: `User request: "${prompt}"
        Financial Context: ${JSON.stringify(context)}
        Sample Entries: ${JSON.stringify(journalEntries.slice(-20))}
        
        Respond ONLY with a JSON object:
        {
          "chartType": "bar" | "pie" | "line" | "horizontal-bar",
          "chartData": [ { "name": "string", "value": number } ],
          "summary": "Arabic summary of what the chart shows."
        }`,
    });

    try {
        return JSON.parse(response.text?.trim() || '{}') as ChartDataResponse;
    } catch (e) {
        throw new Error("عذراً، فشل الذكاء الاصطناعي في تنسيق بيانات الرسم البياني.");
    }
}

export async function getBusinessAdvice(prompt: string, journalEntries: JournalEntry[], accounts: Account[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getFinancialContext(journalEntries, accounts);

    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `You are a professional CFO for an Egyptian Shipping and Customs Clearance company.
        Provide actionable, specific advice in Arabic.
        User Question: "${prompt}"
        Current Financial Summary: ${JSON.stringify(context)}
        
        Format using Markdown:
        ### [Heading]
        * [Advice item]`,
    });
    return response.text || "لم يتمكن المساعد من تقديم نصيحة حالياً.";
}

export async function getAIAccountingAudit(journalEntries: JournalEntry[], accounts: Account[], operations: Operation[]): Promise<AuditFinding[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { responseMimeType: "application/json" },
        contents: `Act as a senior auditor. Audit these records for errors, fraud indicators, or omissions. Respond in Arabic JSON.
        Accounts: ${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, type: a.type })))}
        Recent Journal Entries: ${JSON.stringify(journalEntries.slice(-20))}`,
    });

    try {
        return JSON.parse(response.text?.trim() || '[]');
    } catch (e) {
        return [];
    }
}

export async function getFinancialTrends(journalEntries: JournalEntry[], operations: Operation[], accounts: Account[]): Promise<FinancialTrendAnalysis> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = getFinancialContext(journalEntries, accounts);
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { responseMimeType: "application/json" },
        contents: `Analyze trends for the last quarter based on the following financial context. Compare revenue vs expenses. Respond in Arabic JSON.
        Context: ${JSON.stringify(context)}`,
    });
    return JSON.parse(response.text?.trim() || '{}');
}

export async function getDecisionSupport(problem: string, financialSummary: any): Promise<DecisionOption[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { responseMimeType: "application/json" },
        contents: `Problem: "${problem}" Financial Summary: ${JSON.stringify(financialSummary)}. Propose 3 solutions in Arabic JSON.`,
    });
    return JSON.parse(response.text?.trim() || '[]');
}

export async function getStartupAdvice(accounts: Account[]): Promise<{ title: string; description: string }[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: { responseMimeType: "application/json" },
        contents: `Based on initial Chart of Accounts: ${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, type: a.type })))}, give 3 setup steps in Arabic JSON.`,
    });
    return JSON.parse(response.text?.trim() || '[]');
}

export async function getTaskSuggestions(journalEntries: JournalEntry[], existingTasks: Task[]): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: { responseMimeType: "application/json" },
        contents: `Suggest 3 new tasks in Arabic JSON array of strings based on recent work.`,
    });
    return JSON.parse(response.text?.trim() || '[]');
}

export async function getCustomerInsights(customerBalances: any[]): Promise<AIFinancialInsight> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        config: { responseMimeType: "application/json" },
        contents: `Analyze customer balances: ${JSON.stringify(customerBalances)}. Provide insights on debtors, credit balances, and recommendations. Respond in Arabic JSON.`,
    });
    return JSON.parse(response.text?.trim() || '{}');
}
