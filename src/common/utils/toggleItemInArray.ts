import _ from 'lodash-es'

export const toggleItemInArray = <T>(pool: T[], ...targets: T[]): T[] => _.xor(pool, targets)
