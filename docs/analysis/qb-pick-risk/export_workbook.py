"""Export analytic results to six Markdown matrices and an Excel workbook.

Requires openpyxl. Run after calculate.mts; no database is opened or changed.
"""
import csv
import json
import math
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.styles import Alignment, Font, PatternFill

folder = Path(__file__).resolve().parent
data = json.loads((folder / 'results.json').read_text())
inputs = json.loads((folder / 'inputs.json').read_text())
workbook = Workbook()
workbook.remove(workbook.active)
report = []
for completion in data['completion_rates']:
    sheet = workbook.create_sheet(f'Completion {completion}pct')
    sheet.append([f'Latest Read QB curves and revised multipliers: {completion}% conditional completion'])
    sheet.append(['Read QB', data['readQB'], 'Ball Hawk', data['ballHawk']])
    sheet.append(['Total interception probability: both paths, weighted by QB throw quality.'])
    sheet.append(['QB', 'Accuracy'] + data['bands'])
    report += [f'### {completion}% completion', '', '| QB | Acc | ' + ' | '.join(data['bands']) + ' |', '|---|---:|' + '---:|' * len(data['bands'])]
    for qb in data['quarterbacks']:
        probabilities = [band['totalsByCompletionPct'][str(completion)] for band in qb['bands']]
        sheet.append([qb['name'], qb['accuracy']] + [value / 100 for value in probabilities])
        report.append('| ' + qb['name'] + ' | ' + str(int(qb['accuracy'])) + ' | ' + ' | '.join(f'{value:.2f}%' for value in probabilities) + ' |')
    report.append('')
    for row in sheet.iter_rows(min_row=5, min_col=3):
        for cell in row:
            cell.number_format = '0.00%'
    for cell in sheet[4]:
        cell.font = Font(color='FFFFFF', bold=True)
        cell.fill = PatternFill('solid', fgColor='1F2937')
    sheet.freeze_panes = 'C5'
    sheet.auto_filter.ref = f'A4:I{sheet.max_row}'
    sheet.column_dimensions['A'].width = 19
    for column in 'BCDEFGHI':
        sheet.column_dimensions[column].width = 14
    sheet.conditional_formatting.add(f'C5:I{sheet.max_row}', ColorScaleRule(start_type='min', start_color='E2F0D9', end_type='max', end_color='F8CBAD'))

quality = workbook.create_sheet('Throw quality')
quality.append(['QB', 'Accuracy', 'Perfect', 'Accurate', 'Close', 'Catchable', 'Off Target'])
for qb in data['quarterbacks']:
    quality.append([qb['name'], qb['accuracy']] + [value['chancePct'] / 100 for value in qb['throwTypes']])
for row in quality.iter_rows(min_row=2, min_col=3):
    for cell in row:
        cell.number_format = '0.00%'
quality.column_dimensions['A'].width = 19
for column in 'BCDEFG':
    quality.column_dimensions[column].width = 15

for trait in ['Read QB', 'Ball Hawk']:
    sheet = workbook.create_sheet('Top 40 ' + trait)
    sheet.append(['Rank', 'Player', trait])
    sheet.column_dimensions['B'].width = 22
    for rank, player in enumerate(inputs['top40'][trait], 1):
        sheet.append([rank, player['player'], player['score']])

settings = workbook.create_sheet('Accuracy multipliers')
settings.append(['Throw quality', 'Beat WR multiplier', 'Pick multiplier'])
beat = inputs['multipliers']['DB beats WR to ball based on accuracy']
pick = inputs['multipliers']['Pick Multiplier based on accuracy']
for first, second in zip(beat, pick):
    assert first['throwType'] == second['throwType']
    settings.append([first['throwType'], first['multiplier'], second['multiplier']])
for column in 'ABC':
    settings.column_dimensions[column].width = 23

notes = workbook.create_sheet('Assumptions')
for row in [
    ['Player source', inputs['source_file']],
    ['Player source SHA256', inputs['source_sha256']],
    ['Model', 'Latest Read QB rebalance; existing Ball Hawk polynomial'],
    ['Settings override', 'Both tables: Perfect .25, Accurate .6, Close .8, Catchable 1, Off Target 1.5'],
    ['Top 40 means', 'Read QB 77.8 and Ball Hawk 77.25; separate highest 40 scores across all players'],
    ['Completion assumption', 'Probability a non-jumped pass completes, held equal across throw qualities. Not final observed completion percentage.'],
    ['Openness', 'Actual openness. 0–39 shares Erased polynomial; 90+ skips jumping but can enter secondary interception.'],
    ['Formula', 'SUM_t w_t * [J_t*K_t + (1-J_t)*(1-C)*H*K_t*eligible_t]'],
    ['Eligibility', 'Only Close, Catchable and Off Target incompletions enter secondary checks.'],
    ['Interpretation', 'Per-throw conditional risk at the specified openness; not projected season INT%.'],
]:
    notes.append(row)
notes.column_dimensions['A'].width = 24
notes.column_dimensions['B'].width = 115
for row in notes:
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical='top')

filename = folder / 'qb-interception-matrices.xlsx'
workbook.save(filename)
(folder / 'MATRICES.md').write_text('\n'.join(report))

# Verify the exported files against full-precision results, not rounded display text.
saved = load_workbook(filename, data_only=True)
checked = 0
for completion in data['completion_rates']:
    sheet = saved[f'Completion {completion}pct']
    with (folder / f'revised-completion-{completion}.csv').open(encoding='utf-8-sig') as file:
        rows = list(csv.reader(file))[1:]
    for row_number, qb in enumerate(data['quarterbacks'], 5):
        assert sheet.cell(row_number, 1).value == rows[row_number - 5][0] == qb['name']
        for column, band in enumerate(qb['bands'], 3):
            expected = band['totalsByCompletionPct'][str(completion)]
            assert math.isclose(sheet.cell(row_number, column).value * 100, expected, abs_tol=1e-12, rel_tol=1e-12)
            assert math.isclose(float(rows[row_number - 5][column - 1]), expected, abs_tol=1e-12, rel_tol=1e-12)
            checked += 1
print(f'Updated all six matrices; verified {checked} Excel and CSV cells against analytic results.')
