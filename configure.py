"""Create a NEW configured site folder after personal cloud onboarding. No uploads."""
from pathlib import Path
import argparse,json,re,shutil
parser=argparse.ArgumentParser(description='生成新的待部署文件夹，不覆盖旧文件，不上传数据。')
parser.add_argument('--env-id',required=True,help='公开的上海文档型环境ID，不是密钥')
parser.add_argument('--output-dir',required=True,help='必须是尚不存在的目录')
args=parser.parse_args()
if not re.fullmatch(r'[A-Za-z0-9_-]{5,100}',args.env_id):parser.error('环境ID格式无效')
root=Path(__file__).resolve().parent;destination=Path(args.output_dir).resolve()
if destination.exists():parser.error('输出目录已存在；为避免覆盖，请指定新目录')
shutil.copytree(root/'site',destination)
config={'envId':args.env_id,'region':'ap-shanghai','functionName':'tennisJournal'}
(destination/'cloud-config.js').write_text('window.COURTSIDE_CLOUD_CONFIG=Object.freeze('+json.dumps(config)+');\n')
print('已生成新的待部署目录：',destination)
print('未开通环境、未上传代码或球员数据。服务端COACH_UIDS仍须在控制台配置。')
