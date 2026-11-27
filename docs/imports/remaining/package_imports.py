"""Create the portable DB Browser download without source workbooks or credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
import hashlib

folder=Path(__file__).resolve().parent
files=sorted(folder.glob('[0-9][0-9]-*.sql'))
files += [folder/name for name in ['README.md','TABLES-AND-COLUMNS.md','preview.json','turnover-reconciliation.json','workbook-disposition.csv']]
assert len([p for p in files if p.suffix=='.sql'])==15
archive=folder/'remaining-imports.zip'
with ZipFile(archive,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    for file in files:
        # Stable metadata makes identical artifacts produce an identical archive.
        info=ZipInfo(file.name,date_time=(2026,11,27,0,0,0))
        info.compress_type=ZIP_DEFLATED
        z.writestr(info,file.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert all(z.read(p.name)==p.read_bytes() for p in files)
(folder/'remaining-imports.zip.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  remaining-imports.zip\n')
print(f'{len(files)} verified files in {archive.name}: {archive.stat().st_size:,} bytes')
