import yaml, sys

with open('.github/workflows/ci.yml', encoding='utf-8') as fh:
    doc = yaml.safe_load(fh)

print('YAML OK')
for name, job in doc['jobs'].items():
    needs = job.get('needs', '-')
    if isinstance(needs, list):
        needs = ','.join(needs)
    print(f"  {name:26} needs={needs!s:22} runs-on={job.get('runs-on')}")

for name, job in doc['jobs'].items():
    for step in job.get('steps', []):
        if 'uses' in step and not step['uses'].startswith('./'):
            action, _, ref = step['uses'].partition('@')
            if not ref:
                print(f"ERREUR: {name} utilise {step['uses']} sans version")
                sys.exit(1)
print('toutes les actions sont versionnees')
