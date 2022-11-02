# !/bin/bash
root=$PWD/static/montages

for dataset in $(ls $root)
do 
    echo "Compressing atals in $dataset"
    ffmpeg -i $root/$dataset/2048-img-atlas.jpg -q:v 4 $root/$dataset/2048-img-atlas_compressed.jpg
done