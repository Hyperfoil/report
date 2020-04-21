export default function find(array, target, accessor) {
    let lo = -1, hi = array.length;
    while (1 + lo !== hi) {
        const mi = lo + ((hi - lo) >> 1);
        const value = (
            typeof accessor === "function" ?
                accessor(array[mi]) :
                accessor ?
                    array[mi][accessor] :
                    array[mi]
        )
        if (value === target){
            hi = mi;
        }else
        if (value > target) {
            hi = mi;
        } else {
            lo = mi;
        }
    }
    //if lo is closer to target than hi, return lo?
    //return target == array[lo] ? lo : hi;
    return hi
}
